import PostalMime, {Email} from 'postal-mime';
import {EmailMessage} from '@cloudflare/workers-types';

import {Env} from '../types/env';

export class MailBoxService {
  private env: Env;
  private readonly parser = new PostalMime();

  constructor(env: Env) {
    this.env = env;
  }

  private _trimToLimit(str: string, limit: number) {
    return str.length > limit ? `${str.substring(0, limit - 3)}...` : str;
  }

  public _createTicketId() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    let result = '';
    for (let i = 0; i < 13; i++) {
      result += characters.charAt(
        Math.floor(Math.random() * characters.length)
      );
    }

    return result;
  }

  public async parseMail(rawMessage: string): Promise<Email> {
    const rawEmail = new Response(rawMessage);
    const arrayBuffer = await rawEmail.arrayBuffer();

    return await this.parser.parse(arrayBuffer);
  }

  public generateRequestBody(
    email: Email,
    emailText: string,
    ticketId: string,
    message: EmailMessage,
    appliedTags?: string[]
  ) {
    const formData = new FormData();

    formData.append(
      'payload_json',
      JSON.stringify({
        name: `#${ticketId}: ${this._trimToLimit(
          email.subject || '(제목 없음)',
          100
        )}`,
        message: {
          embeds: [
            {
              title: this._trimToLimit(email.subject || '(제목 없음)', 256),
              description:
                emailText.length > this.env.DISCORD_EMBED_LIMIT
                  ? `${emailText.substring(
                      0,
                      this.env.DISCORD_EMBED_LIMIT - 3
                    )}...`
                  : emailText,
              author: {
                name: `${
                  this._trimToLimit(email.from.name, 100) ||
                  '(발신자 정보 없음)'
                }${email.from.name.length > 64 ? '\n' : ' '}<${
                  this._trimToLimit(email.from.address, 100) || '(알 수 없음)'
                }>`,
              },
              footer: {
                text: `${
                  this._trimToLimit(message.to, 100) || '(알 수 없음)으'
                }로 도착한 메일`,
              },
            },
          ],
        },
        appliedTags: appliedTags,
      })
    );

    if (emailText.length > this.env.DISCORD_EMBED_LIMIT) {
      const newTextBlob = new Blob([emailText], {
        type: 'text/plain',
      });

      if (newTextBlob.size < this.env.DISCORD_FILE_LIMIT) {
        formData.append('files[0]', newTextBlob, 'email.txt');
      } else {
        formData.append(
          'files[0]',
          newTextBlob.slice(0, this.env.DISCORD_FILE_LIMIT, 'text/plain'),
          'email-trimmed.txt'
        );
      }
    }

    return formData;
  }

  public generateMessageRequestBody(
    email: Email,
    emailText: string,
    message: EmailMessage
  ) {
    const formData = new FormData();

    formData.append(
      'payload_json',
      JSON.stringify({
        embeds: [
          {
            title: this._trimToLimit(email.subject || '(제목 없음)', 256),
            description:
              emailText.length > this.env.DISCORD_EMBED_LIMIT
                ? `${emailText.substring(
                    0,
                    this.env.DISCORD_EMBED_LIMIT - 3
                  )}...`
                : emailText,
            author: {
              name: `${
                this._trimToLimit(email.from.name, 100) || '(발신자 정보 없음)'
              }${email.from.name.length > 64 ? '\n' : ' '}<${
                this._trimToLimit(email.from.address, 100) || '(알 수 없음)'
              }>`,
            },
            footer: {
              text: `${
                this._trimToLimit(message.to, 100) || '(알 수 없음)으'
              }로 도착한 메일`,
            },
          },
        ],
      })
    );

    if (emailText.length > this.env.DISCORD_EMBED_LIMIT) {
      const newTextBlob = new Blob([emailText], {
        type: 'text/plain',
      });

      if (newTextBlob.size < this.env.DISCORD_FILE_LIMIT) {
        formData.append('files[0]', newTextBlob, 'email.txt');
      } else {
        formData.append(
          'files[0]',
          newTextBlob.slice(0, this.env.DISCORD_FILE_LIMIT, 'text/plain'),
          'email-trimmed.txt'
        );
      }
    }

    return formData;
  }
}
