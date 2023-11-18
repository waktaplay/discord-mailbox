import * as Realm from 'realm-web';

import { Env } from "."
import { type Email } from "postal-mime"

import { ForwardableEmailMessage as EmailMessage } from "@cloudflare/workers-types"

type Document = globalThis.Realm.Services.MongoDB.Document;
interface MailBox extends Document {
    id: string
    subject: string
    description: string
    author: string
    receiver: string
}

interface extendedEmail extends Email {
    message: EmailMessage,
    content: string | undefined
}

let App: Realm.App;

function createIdKey(length: number = 13) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const charactersLength = characters.length;

    let result = '';
    let counter = 0;

    while (counter < length) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }

    return result;
}

export async function createTicket(email: extendedEmail, env: Env) {
    App = App || new Realm.App(env.MAIL_REALM_APPID);
    const credentials = Realm.Credentials.apiKey(env.MAIL_REALM_TOKEN);

    const user = await App.logIn(credentials);
    const client = user.mongoClient('waktaplay-internal');

    const collection = client.db('waktaplay').collection<MailBox>('mailbox');

    const ticket = {
        id: createIdKey(13),
        subject: email.subject || '(제목 없음)',
        description: email.content || '',
        author: email.from.address,
        receiver: email.message.to
    }

    await collection.insertOne(ticket)

    return ticket
}
