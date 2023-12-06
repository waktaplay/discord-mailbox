/* eslint-disable @typescript-eslint/ban-ts-comment */

import {convert} from 'html-to-text';

import {ChannelType, APIChannelBase} from 'discord-api-types/v10';

// @ts-ignore
import {EmailMessage} from 'cloudflare:email';

import {Env} from './types/env';
import {MailParams} from './types/mailBox';

import {DbService} from './services/dbService';
import {MailBoxService} from './services/mailBoxService';
import {SendMailService} from './services/sendMailService';

export default {
  async email(message: EmailMessage, env: Env) {
    const dbService = new DbService(env);
    const mailBoxService = new MailBoxService(env);
    const sendMailService = new SendMailService(env);

    if (env.FORWARD_TO_ADDRESS) {
      // Forward to mail address first
      await message.forward(env.FORWARD_TO_ADDRESS);
    }

    const email = await mailBoxService.parseMail(message.raw);

    const emailText: string | undefined =
      email.text || (email.html && convert(email.html)) || undefined;
    if (!emailText) return message.setReject('Invalid email payload');

    if (
      email.subject?.includes('[SpaceWak] #') &&
      email.subject?.includes(':')
    ) {
      // 이미 전송된 메일인데 회신을 보낸 경우

      const ticketId = email.subject
        .split('[SpaceWak] #')[1]
        .split(':')[0]
        .trim();

      const ticket = await dbService.getOriginalTicket(ticketId);
      if (!ticket) return message.setReject('Invalid email payload');

      const formData = mailBoxService.generateMessageRequestBody(
        email,
        emailText.split(
          '## 회신을 보내실 경우 이 줄 위에 내용을 입력해 주세요 ##'
        )[0],
        message
      );

      const sendUpdateMessage = await fetch(
        `https://discord.com/api/v10/channels/${ticket.threadId}/messages`,
        {
          method: 'POST',
          body: formData,
          headers: {
            Authorization: 'Bot ' + env.DISCORD_BOT_TOKEN,
          },
        }
      );

      console.log('Discord Response:', await sendUpdateMessage.json());

      if (!sendUpdateMessage.ok) {
        console.error('Discord Notification Failed');
        console.error(
          'Error Message:',
          sendUpdateMessage.status,
          sendUpdateMessage.statusText
        );
      }
    } else {
      // 새로운 메일인 경우
      const ticketId = mailBoxService._createTicketId();
      const appliedTags: string[] = [];

      // 어떤 곳으로 문의가 온건지 분기
      if (message.to.endsWith('@spacewak.net')) {
        appliedTags.push('1175040985584107571'); // 스페이스왁 태그
      } else if (
        message.to.endsWith('@waktaplay.com') ||
        message.to.endsWith('@billboardoo.com')
      ) {
        appliedTags.push('1175040873776549918'); // 왁타플레이 음악 태그
      }

      // 어떤 문의가 온건지 분기
      if (message.to.startsWith('support@')) {
        appliedTags.push('1175042028095164416'); // 기술 지원 태그
      } else if (message.to.startsWith('apply@')) {
        appliedTags.push('1175041484756627526'); // 팀원 지원 태그
      }

      const formData = mailBoxService.generateRequestBody(
        email,
        emailText,
        ticketId,
        message,
        appliedTags
      );

      const createNewPost = await fetch(
        'https://discord.com/api/v10/channels/1175040641470836746/threads',
        {
          method: 'POST',
          body: formData,
          headers: {
            Authorization: 'Bot ' + env.DISCORD_BOT_TOKEN,
          },
        }
      );

      const postResponse =
        (await createNewPost.json()) as APIChannelBase<ChannelType.PublicThread>;

      console.log('Discord Response:', postResponse);

      if (!createNewPost.ok) {
        console.error('Discord Notification Failed');
        console.error(
          'Error Message:',
          createNewPost.status,
          createNewPost.statusText
        );
      } else {
        const ticket = await dbService.createTicket(ticketId, postResponse.id, {
          message: message,
          content: emailText,
          ...email,
        });
        console.log('Ticket Created:', ticketId);

        const mailParams: MailParams = {
          id: ticketId,
          subject: ticket.subject,
          from: {
            address: ticket.receiver,
          },
          to: {
            address: ticket.author,
          },
        };

        console.log(mailParams);

        await sendMailService.replyMail(mailParams);
      }
    }
  },
};
