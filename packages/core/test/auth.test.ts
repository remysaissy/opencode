import { describe, expect, test } from "bun:test"
import { Effect, Layer } from "effect"
import { FSUtil } from "@opencode-ai/core/fs-util"
import { Global } from "@opencode-ai/core/global"
import { Auth } from "@opencode-ai/core/auth"
import { EventV2 } from "@opencode-ai/core/event"
import { tmpdir } from "./fixture/tmpdir"

const withAuth = <A, E>(dir: string, effect: Effect.Effect<A, E, Auth.Service>) =>
  effect.pipe(
    Effect.provide(
      Auth.layer.pipe(
        Layer.provide(FSUtil.defaultLayer),
        Layer.provide(Global.layerWith({ data: dir })),
        Layer.provide(EventV2.defaultLayer),
      ),
    ),
  )

describe("Auth", () => {
  test("stores api credentials", async () => {
    await using tmp = await tmpdir()

    const account = await Effect.runPromise(
      withAuth(
        tmp.path,
        Effect.gen(function* () {
          const auth = yield* Auth.Service
          return yield* auth.create({
            serviceID: Auth.ServiceID.make("anthropic"),
            credential: new Auth.ApiKeyCredential({ type: "api", key: "sk-test" }),
          })
        }),
      ),
    )
    expect(account).toBeDefined()
    if (!account) return

    const active = await Effect.runPromise(
      withAuth(
        tmp.path,
        Effect.gen(function* () {
          const auth = yield* Auth.Service
          return yield* auth.active(Auth.ServiceID.make("anthropic"))
        }),
      ),
    )

    expect(active?.id).toBe(account.id)
    expect(active?.credential).toEqual({ type: "api", key: "sk-test" })
  })
})
