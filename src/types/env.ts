export interface Env {
  DISCORD_BOT_TOKEN: string;

  DISCORD_EMBED_LIMIT: number; // 4096
  DISCORD_FILE_LIMIT: number; // 8000000

  MAILJET_API_KEY: string;
  MAILJET_API_SECRET: string;

  MAIL_REALM_APPID: string;
  MAIL_REALM_TOKEN: string;

  FORWARD_TO_ADDRESS?: string;
}
