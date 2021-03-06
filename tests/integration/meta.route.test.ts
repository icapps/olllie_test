import * as request from 'supertest';
import * as Joi from 'joi';
import * as httpStatus from 'http-status';
import * as faker from 'faker';
import { sortBy } from 'lodash';

import { app } from '../../src/app';
import { clearAll } from '../_helpers/mockdata/data';
import { validUsers, createUsers } from '../_helpers/mockdata/user.data';
import { createCodeType, createCode, clearCodeTypesData, clearCodesData } from '../_helpers/mockdata/meta.data';
import { getValidJwt, getAdminToken, getUserToken } from '../_helpers/mockdata/auth.data';
import { codeTypesSchema, codesSchema, codeSchema, createCodeSchema } from '../_helpers/payload-schemes/meta.schema';
import { errors } from '../../src/config/errors.config';

describe('/meta', () => {
  const prefix = `/api/${process.env.API_VERSION}`;
  let userToken;
  let adminToken;

  beforeAll(async () => {
    await clearAll(); // Full db clear
    userToken = await getUserToken(); // Also creates user
    adminToken = await getAdminToken(); // Also creates user
  });

  afterAll(async () => {
    await clearAll(); // Full db clear - empty db after tests
  });

  describe('GET /codes/:codeType', () => {
    const prefix = `/api/${process.env.API_VERSION}`;
    let codeType;
    let countryCodeType;
    let languageCodes;

    beforeAll(async () => {
      codeType = await createCodeType({ code: 'LAN', name: 'Language' });
      const code1 = await createCode(codeType.id, { name: 'English', code: 'EN', isActive: false });
      const code2 = await createCode(codeType.id, { name: 'Nederlands', code: 'NL' });
      const code3 = await createCode(codeType.id, { name: 'French', code: 'FR' });
      const code4 = await createCode(codeType.id, { name: 'Weutelen', code: 'WEUTELS' });
      languageCodes = [code1, code2, code3, code4];

      countryCodeType = await createCodeType({ code: 'CNTRY', name: 'Country' });
      createCode(countryCodeType.id, { name: 'Belgium', code: 'BE' });
      createCode(countryCodeType.id, { name: 'Germany', code: 'DE' });
      createCode(countryCodeType.id, { name: 'Poland', code: 'PL' });
    });

    afterAll(async () => {
      await clearCodeTypesData();
    });

    it('Should return language codes where isActive=true with default pagination', async () => {
      const { body, status } = await request(app)
        .get(`${prefix}/meta/codes/${codeType.code.toLowerCase()}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(status).toEqual(httpStatus.OK);
      expect(body.meta).toMatchObject({
        type: 'codes',
        count: 3,
        totalCount: 3,
      });

      Joi.validate(body, codesSchema, (err, value) => {
        if (err) throw err;
        if (!value) throw new Error('no value to check schema');
      });
    });

    it('Should return all country codes with provided pagination', async () => {
      const { body, status } = await request(app)
        .get(`${prefix}/meta/codes/${countryCodeType.code.toLowerCase()}`)
        .set('Authorization', `Bearer ${userToken}`)
        .query('limit=1')
        .query('offset=2');

      expect(status).toEqual(httpStatus.OK);
      expect(body.meta).toMatchObject({
        type: 'codes',
        count: 1,
        totalCount: 3,
      });

      Joi.validate(body, codesSchema, (err, value) => {
        if (err) throw err;
        if (!value) throw new Error('no value to check schema');
      });
    });

    it('Should return codes in ascending order for value', async () => {
      const { body, status } = await request(app)
        .get(`${prefix}/meta/codes/${codeType.code.toLowerCase()}`)
        .set('Authorization', `Bearer ${userToken}`)
        .query('sortField=value')
        .query('sortOrder=asc');

      expect(status).toEqual(httpStatus.OK);
      expect(body.data).toHaveLength(3);
      expect(body.meta).toMatchObject({
        type: 'codes',
        count: 3,
        totalCount: 3,
      });

      const activeLanguageCodes = languageCodes.filter(c => c.isActive);
      const sorted = sortBy(activeLanguageCodes, 'value');
      body.data.forEach((code, index) => {
        expect(code.code).toEqual(sorted[index].code);
      });
    });

    it('Should return all codes matching `English` in value', async () => {
      const { body, status } = await request(app)
        .get(`${prefix}/meta/codes/${codeType.code.toLowerCase()}`)
        .set('Authorization', `Bearer ${userToken}`)
        .query('search=English');

      expect(status).toEqual(httpStatus.OK);
      expect(body.data).toHaveLength(1);
      expect(body.meta).toMatchObject({
        type: 'codes',
        count: 1,
        totalCount: 1,
      });

      const found = languageCodes.find(x => x.code === 'EN');
      expect(body.data[0].value).toEqual(found.value);
    });

    it('Should throw an error when code type is not found', async () => {
      const { body, status } = await request(app)
        .get(`${prefix}/meta/codes/unknownType`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(status).toEqual(httpStatus.NOT_FOUND);
    });
  });

  describe('GET /codes/:codeType/all', () => {
    const prefix = `/api/${process.env.API_VERSION}`;
    let codeType;
    let languageCodes;

    beforeAll(async () => {
      codeType = await createCodeType({ code: 'LAN', name: 'Language' });
      const code1 = await createCode(codeType.id, { name: 'English', code: 'EN', isActive: true });
      const code2 = await createCode(codeType.id, { name: 'Nederlands', code: 'NL' });
      const code3 = await createCode(codeType.id, { name: 'French', code: 'FR' });
      const code4 = await createCode(codeType.id, { name: 'Weutelen', code: 'WEUTELS' });
      languageCodes = [code1, code2, code3, code4];
    });

    afterAll(async () => {
      await clearCodeTypesData();
    });

    it('Should return all language codes with default pagination', async () => {
      const { body, status } = await request(app)
        .get(`${prefix}/meta/codes/${codeType.code.toLowerCase()}/all`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(status).toEqual(httpStatus.OK);
      expect(body.meta).toMatchObject({
        type: 'codes',
        count: 4,
        totalCount: 4,
      });

      Joi.validate(body, codesSchema, (err, value) => {
        if (err) throw err;
        if (!value) throw new Error('no value to check schema');
      });
    });
    it('Should throw an error without admin permission', async () => {
      const { body, status } = await request(app)
        .get(`${prefix}/meta/codes/${codeType.code.toLowerCase()}/all`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(status).toEqual(httpStatus.UNAUTHORIZED);
      expect(body.errors[0].code).toEqual(errors.NO_PERMISSION.code);
      expect(body.errors[0].title).toEqual(errors.NO_PERMISSION.message);
    });
  });

  describe('POST /codes/:codeType', () => {
    const prefix = `/api/${process.env.API_VERSION}`;
    let codeType;

    beforeAll(async () => {
      codeType = await createCodeType({ code: 'LAN', name: 'Language' });
    });

    afterAll(async () => {
      await clearCodeTypesData();
      await clearCodesData();
    });

    it('Should succesfully create a new code', async () => {
      const { body, status } = await request(app)
        .post(`${prefix}/meta/codes/${codeType.code.toLowerCase()}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'NL',
          name: 'Nederlands',
        });

      expect(status).toEqual(httpStatus.CREATED);
      expect(body.data.code).toEqual('NL');
      expect(body.data.name).toEqual('Nederlands');

      Joi.validate(body, createCodeSchema, (err, value) => {
        if (err) throw err;
        if (!value) throw new Error('no vaflue to check schema');
      });
    });

    it('Should throw an error when trying to create a duplicate code', async () => {
      const { status } = await request(app)
        .post(`${prefix}/meta/codes/${codeType.code.toLowerCase()}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ code: 'FE', name: 'Nederlands' });

      expect(status).toEqual(httpStatus.CREATED);

      const { body, status: status2 } = await request(app)
        .post(`${prefix}/meta/codes/${codeType.code.toLowerCase()}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ code: 'FE', name: 'Another NL' });

      expect(status2).toEqual(httpStatus.BAD_REQUEST);
      expect(body.errors[0].code).toEqual(errors.CODE_DUPLICATE.code);
      expect(body.errors[0].title).toEqual(errors.CODE_DUPLICATE.message);
    });

    it('Should throw an error when code type is not found', async () => {
      const { body, status } = await request(app)
        .post(`${prefix}/meta/codes/unknownType`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'NL',
          name: 'Nederlands',
        });

      expect(status).toEqual(httpStatus.NOT_FOUND);
    });

    it('Should throw an error without admin permission', async () => {
      const { body, status } = await request(app)
        .post(`${prefix}/meta/codes/${codeType.code.toLowerCase()}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(status).toEqual(httpStatus.UNAUTHORIZED);
      expect(body.errors[0].code).toEqual(errors.NO_PERMISSION.code);
      expect(body.errors[0].title).toEqual(errors.NO_PERMISSION.message);
    });
  });

  describe('POST /codes/:codeId/deprecate', () => {
    const prefix = `/api/${process.env.API_VERSION}`;
    let code;

    beforeAll(async () => {
      const codeType = await createCodeType({ code: 'LAN', name: 'Language' });
      code = await createCode(codeType.id, { name: 'Zalosh', code: 'ZL' });
    });

    afterAll(async () => {
      await clearCodeTypesData();
      await clearCodesData();
    });

    it('Should succesfully deprecate an existing code', async () => {
      const { body, status } = await request(app)
        .post(`${prefix}/meta/codes/${code.id}/deprecate`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(status).toEqual(httpStatus.OK);
    });

    it('Should throw an error when code is not a valid guid', async () => {
      const { body, status } = await request(app)
        .post(`${prefix}/meta/codes/unknownType/deprecate`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(status).toEqual(httpStatus.BAD_REQUEST);
    });

    it('Should throw an error when code is not found', async () => {
      const { body, status } = await request(app)
        .post(`${prefix}/meta/codes/${faker.random.uuid()}/deprecate`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(status).toEqual(httpStatus.NOT_FOUND);
    });

    it('Should throw an error without admin permission', async () => {
      const { body, status } = await request(app)
        .post(`${prefix}/meta/codes/${code.id}/deprecate`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(status).toEqual(httpStatus.UNAUTHORIZED);
      expect(body.errors[0].code).toEqual(errors.NO_PERMISSION.code);
      expect(body.errors[0].title).toEqual(errors.NO_PERMISSION.message);
    });
  });
});
