/* eslint-disable node/no-unsupported-features/es-builtins */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as Realm from 'realm-web'; // 없으면 Realm is not defined 에러 발생

import {type Email} from 'postal-mime';
import {ForwardableEmailMessage as EmailMessage} from '@cloudflare/workers-types';

type Document = globalThis.Realm.Services.MongoDB.Document;

export interface MailParams {
  id: string;
  subject: string;
  from: {
    address: string;
  };
  to: {
    address: string;
  };
}

export interface MailBox extends Document {
  id: string;
  threadId: string;

  subject: string;
  description: string;

  author: string;
  receiver: string;
}

export interface extendedEmail extends Email {
  message: EmailMessage;
  content: string | undefined;
}
