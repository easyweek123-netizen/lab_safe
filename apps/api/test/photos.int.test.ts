import { ErrorResponse, Photo, PHOTO_MAX_BYTES } from '@labsafe/shared';
import type { INestApplication } from '@nestjs/common';
import sharp from 'sharp';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createSignedInUser } from './auth-helpers';
import { createTestApp, resetTables } from './helpers';

const UNKNOWN_ID = '5c1f3d2e-8b7a-4c6d-9e0f-1a2b3c4d5e6f';
const TOO_LARGE = 'The photo must be at most 5 MB.';
const WRONG_TYPE = 'Only JPEG or PNG photos are accepted.';

/** A JPEG of `width` × `height` red pixels without metadata. */
function plainJpeg(width: number, height: number): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: '#cc2200' } })
    .jpeg()
    .toBuffer();
}

/** The EXIF tag that points to the GPS block (0x8825), in the little-endian order sharp writes. */
const GPS_IFD_POINTER = Buffer.from([0x25, 0x88]);

/** A fully transparent PNG of `width` × `height`. */
function transparentPng(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .png()
    .toBuffer();
}

const XMP_PACKET =
  '<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">' +
  '<rdf:Description xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:creator>Test Camera Owner</dc:creator>' +
  '</rdf:Description></rdf:RDF></x:xmpmeta>';

/**
 * A 2000 × 1000 JPEG with camera data, GPS coordinates, XMP and EXIF orientation 6 (to be
 * turned 90° clockwise), so the stored photo must be 800 × 1600.
 */
function jpegWithMetadata(): Promise<Buffer> {
  return sharp({ create: { width: 2000, height: 1000, channels: 3, background: '#2255cc' } })
    .jpeg()
    .withExif({
      IFD0: { Make: 'TestCam', Model: 'TC-1' },
      IFD3: {
        GPSLatitudeRef: 'N',
        GPSLatitude: '48/1 18/1 0/1',
        GPSLongitudeRef: 'E',
        GPSLongitude: '14/1 17/1 0/1',
      },
    })
    .withMetadata({ orientation: 6 })
    .withXmp(XMP_PACKET)
    .toBuffer();
}

describe('/api/photos', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let owner: { id: string; cookie: string };
  let admin: { id: string; cookie: string };
  let otherContributor: { id: string; cookie: string };
  let pending: { id: string; cookie: string };
  let rejected: { id: string; cookie: string };

  beforeAll(async () => {
    app = await createTestApp({ COOKIE_SECURE: 'false' });
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetTables();
    owner = await createSignedInUser(app, {
      name: 'Olga Owner',
      email: 'owner@lab.test',
      status: 'APPROVED',
    });
    admin = await createSignedInUser(app, {
      email: 'admin@lab.test',
      role: 'ADMIN',
      status: 'APPROVED',
    });
    otherContributor = await createSignedInUser(app, {
      email: 'other@lab.test',
      status: 'APPROVED',
    });
    pending = await createSignedInUser(app, { email: 'pending@lab.test', status: 'PENDING' });
    rejected = await createSignedInUser(app, { email: 'rejected@lab.test', status: 'REJECTED' });
  });

  const http = () => request(app.getHttpServer());

  function upload(
    cookie: string | undefined,
    bytes: Buffer,
    filename = 'photo.jpg',
    contentType = 'image/jpeg',
  ): request.Test {
    const call = http().post('/api/photos');
    return (cookie ? call.set('Cookie', cookie) : call).attach('photo', bytes, {
      filename,
      contentType,
    });
  }

  function read(cookie: string | undefined, id: string): request.Test {
    const call = http()
      .get(`/api/photos/${id}`)
      .buffer(true)
      .parse((response, callback) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () => callback(null, Buffer.concat(chunks)));
      });
    return cookie ? call.set('Cookie', cookie) : call;
  }

  async function photoCount(): Promise<number> {
    const rows: Array<{ count: string }> = await dataSource.query(
      'SELECT count(*) AS count FROM photos',
    );
    return Number(rows[0]!.count);
  }

  async function storedBytes(id: string): Promise<Buffer> {
    const rows: Array<{ bytes: Buffer }> = await dataSource.query(
      'SELECT bytes FROM photos WHERE id = $1',
      [id],
    );
    return rows[0]!.bytes;
  }

  function expectError(response: request.Response, status: number, code: string): ErrorResponse {
    expect(response.status).toBe(status);
    const body = ErrorResponse.parse(response.body);
    expect(body.code).toBe(code);
    return body;
  }

  async function uploadAs(cookie: string): Promise<Photo> {
    const response = await upload(cookie, await plainJpeg(640, 480));
    expect(response.status).toBe(201);
    return Photo.parse(response.body);
  }

  describe('POST /api/photos', () => {
    it('S03.1 AC4 stores a large JPEG as a JPEG at most 1600 px on its longer side', async () => {
      const response = await upload(owner.cookie, await plainJpeg(3000, 2000));

      expect(response.status).toBe(201);
      const photo = Photo.parse(response.body);
      expect(Object.keys(response.body as object).sort()).toEqual(['height', 'id', 'width']);
      expect({ width: photo.width, height: photo.height }).toEqual({ width: 1600, height: 1067 });
      const stored = await sharp(await storedBytes(photo.id)).metadata();
      expect(stored).toMatchObject({ format: 'jpeg', width: 1600, height: 1067 });
    });

    it('S03.1 AC4 stores a PNG as a JPEG, flattened on white and never enlarged', async () => {
      const response = await upload(
        owner.cookie,
        await transparentPng(400, 300),
        'photo.png',
        'image/png',
      );

      expect(response.status).toBe(201);
      const photo = Photo.parse(response.body);
      expect({ width: photo.width, height: photo.height }).toEqual({ width: 400, height: 300 });
      const bytes = await storedBytes(photo.id);
      expect(await sharp(bytes).metadata()).toMatchObject({ format: 'jpeg', channels: 3 });
      const { channels } = await sharp(bytes).stats();
      expect(channels.map(({ mean }) => Math.round(mean))).toEqual([255, 255, 255]);
    });

    it('S03.1 AC4 reads the type from the content, not from the file name or stated type', async () => {
      const response = await upload(
        owner.cookie,
        await transparentPng(100, 100),
        'photo.pdf',
        'application/pdf',
      );

      expect(response.status).toBe(201);
    });

    it('S03.1 AC5 refuses a file of 5 MB + 1 byte with 413 PHOTO_TOO_LARGE and stores nothing', async () => {
      const response = await upload(owner.cookie, Buffer.alloc(PHOTO_MAX_BYTES + 1, 0xff));

      const body = expectError(response, 413, 'PHOTO_TOO_LARGE');
      expect(body.message).toBe(TOO_LARGE);
      expect(await photoCount()).toBe(0);
    });

    it('S03.1 AC6 refuses a PDF named .jpg with type image/jpeg with 415 PHOTO_TYPE', async () => {
      const pdf = Buffer.from('%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer\n%%EOF\n');

      const response = await upload(owner.cookie, pdf, 'manual.jpg', 'image/jpeg');

      const body = expectError(response, 415, 'PHOTO_TYPE');
      expect(body.message).toBe(WRONG_TYPE);
      expect(await photoCount()).toBe(0);
    });

    it('S03.1 AC6 refuses a readable image that is not a JPEG or PNG with 415', async () => {
      const gif = await sharp({
        create: { width: 20, height: 20, channels: 3, background: '#00ff00' },
      })
        .gif()
        .toBuffer();

      const response = await upload(owner.cookie, gif, 'photo.png', 'image/png');

      expectError(response, 415, 'PHOTO_TYPE');
      expect(await photoCount()).toBe(0);
    });

    it('S03.1 AC6 refuses a truncated JPEG with 415', async () => {
      const jpeg = await plainJpeg(800, 600);

      const response = await upload(owner.cookie, jpeg.subarray(0, 200));

      expectError(response, 415, 'PHOTO_TYPE');
      expect(await photoCount()).toBe(0);
    });

    it('S03.1 AC6 answers a request with no file with 400 VALIDATION_FAILED on photo', async () => {
      const response = await http()
        .post('/api/photos')
        .set('Cookie', owner.cookie)
        .field('note', 'no file here');

      const body = expectError(response, 400, 'VALIDATION_FAILED');
      expect(body.fields).toEqual([{ path: 'photo', message: 'Choose a photo' }]);
      expect(await photoCount()).toBe(0);
    });

    it('S03.1 AC6 answers a file in another field with 400 VALIDATION_FAILED on photo', async () => {
      const response = await http()
        .post('/api/photos')
        .set('Cookie', owner.cookie)
        .attach('picture', await plainJpeg(10, 10), 'photo.jpg');

      const body = expectError(response, 400, 'VALIDATION_FAILED');
      expect(body.fields).toEqual([{ path: 'photo', message: 'Choose a photo' }]);
      expect(await photoCount()).toBe(0);
    });

    it('S03.1 AC7 removes EXIF (GPS, camera), XMP and IPTC and applies the orientation', async () => {
      const original = await jpegWithMetadata();
      const before = await sharp(original).metadata();
      expect(before.exif?.includes('TestCam')).toBe(true);
      expect(before.exif?.includes(GPS_IFD_POINTER)).toBe(true);
      expect(before.xmp).toBeDefined();
      expect(before.orientation).toBe(6);

      const uploaded = await upload(owner.cookie, original);
      expect(uploaded.status).toBe(201);
      const photo = Photo.parse(uploaded.body);
      const response = await read(owner.cookie, photo.id);

      expect(response.status).toBe(200);
      const bytes = response.body as Buffer;
      const after = await sharp(bytes).metadata();
      expect(after.format).toBe('jpeg');
      expect(after.exif).toBeUndefined();
      expect(after.xmp).toBeUndefined();
      expect(after.iptc).toBeUndefined();
      expect(after.orientation).toBeUndefined();
      expect({ width: after.width, height: after.height }).toEqual({ width: 800, height: 1600 });
      expect({ width: photo.width, height: photo.height }).toEqual({ width: 800, height: 1600 });
      // No APP1 segment (EXIF and XMP) and no APP13 segment (IPTC) in the bytes at all.
      expect(bytes.includes(Buffer.from('Exif\0'))).toBe(false);
      expect(bytes.includes(Buffer.from('http://ns.adobe.com/xap/1.0/'))).toBe(false);
      expect(bytes.includes(Buffer.from('Photoshop 3.0'))).toBe(false);
      expect(bytes.includes(Buffer.from('TestCam'))).toBe(false);
    });

    it('S03.1 AC14 refuses an anonymous upload with 401 and stores nothing', async () => {
      const response = await upload(undefined, await plainJpeg(10, 10));

      expectError(response, 401, 'UNAUTHENTICATED');
      expect(await photoCount()).toBe(0);
    });

    it('S03.1 AC14 refuses pending and rejected accounts with 403 and stores nothing', async () => {
      for (const caller of [pending, rejected]) {
        const response = await upload(caller.cookie, await plainJpeg(10, 10));
        expectError(response, 403, 'FORBIDDEN');
      }
      expect(await photoCount()).toBe(0);
    });

    it('S03.1 AC14 refuses a refused caller before reading the file (no 413 for them)', async () => {
      const response = await upload(pending.cookie, Buffer.alloc(PHOTO_MAX_BYTES + 1, 0xff));

      expectError(response, 403, 'FORBIDDEN');
      expect(await photoCount()).toBe(0);
    });

    it('S03.1 AC14 lets an admin upload (201)', async () => {
      const photo = await uploadAs(admin.cookie);

      const rows: Array<{ owner_id: string }> = await dataSource.query(
        'SELECT owner_id FROM photos WHERE id = $1',
        [photo.id],
      );
      expect(rows[0]!.owner_id).toBe(admin.id);
    });
  });

  describe('GET /api/photos/:id', () => {
    it('S03.1 AC15 serves the photo to its owner and to an admin with the headers', async () => {
      const photo = await uploadAs(owner.cookie);
      const stored = await storedBytes(photo.id);

      for (const caller of [owner, admin]) {
        const response = await read(caller.cookie, photo.id);
        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toBe('image/jpeg');
        expect(response.headers['cache-control']).toBe('private, no-cache');
        expect(response.headers['x-content-type-options']).toBe('nosniff');
        expect(Buffer.compare(response.body as Buffer, stored)).toBe(0);
      }
    });

    it('S03.1 AC15 answers everyone else the same 404 NOT_FOUND as an unknown id', async () => {
      const photo = await uploadAs(owner.cookie);
      const unknown = await http().get(`/api/photos/${UNKNOWN_ID}`).set('Cookie', owner.cookie);
      expectError(unknown, 404, 'NOT_FOUND');

      for (const cookie of [undefined, pending.cookie, rejected.cookie, otherContributor.cookie]) {
        const call = http().get(`/api/photos/${photo.id}`);
        const response = await (cookie ? call.set('Cookie', cookie) : call);
        expectError(response, 404, 'NOT_FOUND');
        expect(response.body).toEqual(unknown.body);
      }
    });

    it('S03.1 AC15 answers a malformed id with 400 VALIDATION_FAILED', async () => {
      const response = await http().get('/api/photos/not-a-uuid').set('Cookie', owner.cookie);

      const body = expectError(response, 400, 'VALIDATION_FAILED');
      expect(body.fields?.map(({ path }) => path)).toEqual(['id']);
    });

    it("S03.1 AC19 answers an anonymous visitor 404 for a pending page's photo", async () => {
      const photo = await uploadAs(owner.cookie);
      await insertPendingRevision(owner.id, photo.id);

      const response = await http().get(`/api/photos/${photo.id}`);

      expectError(response, 404, 'NOT_FOUND');
    });
  });

  /** A pending "Rotary evaporator" revision that uses `photoId`, written straight to the tables. */
  async function insertPendingRevision(userId: string, photoId: string): Promise<void> {
    const [instrument] = (await dataSource.query(
      'INSERT INTO instruments (created_by) VALUES ($1) RETURNING id',
      [userId],
    )) as Array<{ id: string }>;
    const [room] = (await dataSource.query(
      'SELECT id FROM lab_rooms ORDER BY code LIMIT 1',
    )) as Array<{ id: string }>;
    const location = { kind: 'LOCATION', location: 'Next to the door' };
    await dataSource.query(
      `INSERT INTO instrument_revisions (instrument_id, kind, status, submitted_by, submitted_at,
         name, description, category, lab_room_id, responsible_name, responsible_contact,
         hazard_level, training_required, no_significant_hazards, standard_lab_attire_only,
         hazard_pictograms, before_use, safe_operation, do_not, emergency, emergency_phone,
         emergency_equipment, photo_id)
       VALUES ($1, 'NEW', 'PENDING', $2, now(), 'Rotary evaporator', 'Removes solvents.',
         'SEPARATION_EVAPORATION', $3, 'Rita Responsible', 'ext. 1234', 'MEDIUM', false, true,
         true, '{}', 'Check the glassware.', 'Start the rotation first.', 'Do not heat a closed system.',
         'Stop the bath and call for help.', '112', $4, $5)`,
      [
        instrument!.id,
        userId,
        room!.id,
        JSON.stringify({
          EYEWASH: location,
          SAFETY_SHOWER: location,
          FIRE_EXTINGUISHER: location,
          SPILL_KIT: location,
          FIRST_AID_KIT: location,
          EMERGENCY_STOP: { kind: 'NOT_APPLICABLE' },
        }),
        photoId,
      ],
    );
  }
});
