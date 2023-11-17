import PostalMime from "postal-mime"
import { convert } from "html-to-text"

import { createTicket } from "./utils"

import { ExecutionContext, ForwardableEmailMessage as EmailMessage } from "@cloudflare/workers-types"

export interface Env {
    MAIL_REALM_APPID: string
    MAIL_RELAM_TOKEN: string
    FORWARD_TO_ADDRESS?: string
    
    DISCORD_BOT_TOKEN: string

    DISCORD_EMBED_LIMIT: number // 4096
    DISCORD_FILE_LIMIT: number // 8000000
}

interface DiscordMessage {
    embeds: {
        title?: string
        description?: string
        author: {
            name: string
        }
        footer: {
            text: string
        }
    }[]
}

export default {
    async email(message: EmailMessage, env: Env, ctx: ExecutionContext) {
        // Initializing Parser
        const parser = new PostalMime()

        if (env.FORWARD_TO_ADDRESS) {
            // Forward to mail address first
            await message.forward(env.FORWARD_TO_ADDRESS)
        }

        // Parse email data
        const rawEmail = new Response(message.raw)
        const arrayBuffer = await rawEmail.arrayBuffer()
        const email = await parser.parse(arrayBuffer)

        // create embed
        const emailText: string | undefined = email.text || email.html && convert(email.html) || undefined
        if (!emailText) return

        const messageBody: DiscordMessage = {
            embeds: [
                {
                    title: this.trimToLimit(email.subject, 256) || '(제목 없음)',
                    description: emailText.length > env.DISCORD_EMBED_LIMIT ? `${emailText.substring(0, env.DISCORD_EMBED_LIMIT - 3)}...` : emailText,
                    author: {
                        name: `${(this.trimToLimit(email.from.name, 100)) || '(발신자 정보 없음)'}${email.from.name.length > 64 ? "\n" : " "}<${this.trimToLimit(email.from.address, 100) || '(알 수 없음)'}>`,
                    },
                    footer: {
                        text: `${this.trimToLimit(message.to, 100) || '(알 수 없음)으'}로 도착한 메일`,
                    }
                }
            ]
        }

        const appliedTags: string[] = []

        // 어떤 곳으로 문의가 온건지 분기
        if (message.to.endsWith("@spacewak.info")) {
            appliedTags.push("1175040985584107571") // 스페이스왁 태그
        } else if (message.to.endsWith("@waktaplay.com") || message.to.endsWith("@billboardoo.com")) {
            appliedTags.push("1175040873776549918") // 왁타플레이 음악 태그
        }

        // 어떤 문의가 온건지 분기
        if (message.to.startsWith("support@")) {
            appliedTags.push("1175042028095164416") // 기술 지원 태그
        } else if (message.to.startsWith("apply@")) {
            appliedTags.push("1175041484756627526") // 팀원 지원 태그
        }

        const ticket = await createTicket({ message: message, content: emailText, ...email }, env);

        const formData = new FormData()
        formData.append("payload_json", JSON.stringify({
            name: `#${ticket.id}: ${this.trimToLimit(email.subject, 100) || '(제목 없음)'}`,
            message: messageBody,
            applied_tags: appliedTags
        }))

        if (emailText.length > env.DISCORD_EMBED_LIMIT) {
            const newTextBlob = new Blob([emailText], {
                type: "text/plain",
            })

            if (newTextBlob.size < env.DISCORD_FILE_LIMIT) {
                formData.append("files[0]", newTextBlob, "email.txt")
            } else {
                formData.append(
                  "files[0]",
                  newTextBlob.slice(0, env.DISCORD_FILE_LIMIT, "text/plain"),
                  "email-trimmed.txt"
                )
            }
        }

        const createPost = await fetch(`https://discord.com/api/v10/channels/1175040641470836746/threads`, {
            method: "POST",
            body: formData,
        })

        if (!createPost.ok) {
            console.error("Discord Notification Failed")
            console.error("Error Message:", createPost.status, createPost.statusText)
            
            console.log("Discord Response:", await createPost.json())
        }
    },
    trimToLimit(input: string | undefined, limit: number): string | null {
        if (!input) {
            return null
        }

        return input.length > limit ? `${input.substring(0, limit - 3)}...` : input
    }
}