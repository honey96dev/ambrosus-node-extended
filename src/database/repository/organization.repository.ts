/*
 * Copyright: Ambrosus Inc.
 * Email: tech@ambrosus.com
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files
 * (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import { inject, injectable } from 'inversify';

import { TYPE } from '../../constant';
import { Organization, APIQuery } from '../../model';
import { DBClient } from '../client';
import { BaseRepository } from './base.repository';

import { config } from '../../config';
import { getTimestamp } from '../../util';

@injectable()
export class OrganizationRepository extends BaseRepository<Organization> {
  constructor(@inject(TYPE.DBClient) protected client: DBClient) {
    super(client, 'organization');

    client.events.on('dbConnected', () => {
      client.db.collection('organization').createIndex({ organizationId: 1 }, { unique: true });
      client.db.collection('organization').createIndex({ owner: 1 }, { unique: true });
    });
  }

  public async builtInCheck() {
    const organizationProbe = await this.findOne(new APIQuery({ organizationId: 0 }));

    if (organizationProbe === undefined) {

      const organization = new Organization;
      organization.owner = config.builtinAddress;
      organization.title = 'built-in';
      organization.active = true;
      organization.createdBy = config.builtinAddress;
      organization.organizationId = 0;
      organization.createdOn = getTimestamp();

      await this.create(organization);
    }
  }

  get paginatedField(): string {
    return 'createdOn';
  }

  get paginatedAscending(): boolean {
    return false;
  }

  public getOrganizationForAuthorization(apiQuery: APIQuery): Promise<Organization> {
    return super.findOne(apiQuery);
  }

  public async getNewOrganizationIdentifier(): Promise<number> {
    await this.client.getConnection();

    const result = await this.client.db
      .collection('identityCounter')
      .findOneAndUpdate(
        { indentity: 'organization_index' },
        { $inc: { count: 9 } },
        { upsert: true, returnOriginal: false }
      );

    return result.value.count;
  }
}
