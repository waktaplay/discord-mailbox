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

let app: Realm.App;

export async function createTicket(email: extendedEmail, env: Env) {
    app = app || new Realm.App(env.MAIL_REALM_APPID);
    const credentials = Realm.Credentials.apiKey(env.MAIL_REALM_TOKEN);

    const user = await app.logIn(credentials);
    const client = user.mongoClient('mongodb-atlas');

    const collection = client.db('waktaplay').collection<MailBox>('mailbox');

    const ticket = {
        id: email.message.headers.get("Message-ID") as string,
        subject: email.subject || '(제목 없음)',
        description: email.content || '',
        author: email.from.address,
        receiver: email.message.to
    }

    await collection.insertOne(ticket)

    return ticket
}
