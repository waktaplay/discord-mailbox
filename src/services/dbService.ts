/* eslint-disable node/no-unsupported-features/es-builtins */
import * as Realm from 'realm-web';

import {Env} from '../types/env';
import {MailBox, extendedEmail} from '../types/mailBox';

export class DbService {
  private app: Realm.App;
  private credentials: Realm.Credentials;

  constructor(env: Env) {
    this.app = new Realm.App(env.MAIL_REALM_APPID);
    this.credentials = Realm.Credentials.apiKey(env.MAIL_REALM_TOKEN);
  }

  private async _getMailCollection(): Promise<
    globalThis.Realm.Services.MongoDB.MongoDBCollection<MailBox>
  > {
    const user = await this.app.logIn(this.credentials);
    const client = user.mongoClient('mongodb-atlas');

    return client.db('waktaplay').collection<MailBox>('mailbox');
  }

  public async createTicket(
    ticketId: string,
    threadId: string,
    email: extendedEmail
  ) {
    const collection = await this._getMailCollection();

    const ticket = {
      id: ticketId.toUpperCase(),
      threadId: threadId,
      subject: email.subject || '(제목 없음)',
      description: email.content || '',
      author: email.from.address,
      receiver: email.message.to,
    };

    await collection.insertOne(ticket);

    return ticket;
  }

  public async getOriginalTicket(ticketId: string) {
    const collection = await this._getMailCollection();

    const ticket = await collection.findOne({id: ticketId});

    return ticket;
  }
}
