# Oneainexus OpenClaw Connector / Channel 鎻掍欢鏂规

## 鍏堣缁撹

濡傛灉浣犵殑鐩爣鏄細

1. 璁?`oneainexus-openclaw-chat` 鎴愪负浣犺嚜宸辩殑鑱婂ぉ鍏ュ彛
2. 璁?OpenClaw 璐熻矗鐪熸鐨?Agent 鎺ㄧ悊鍜屽洖澶?3. 璁?`oneainexus-chat-sdk` 浣滀负涓よ€呬箣闂寸殑鍙屽悜妗?
閭ｄ箞浣犺鍐欑殑涓嶆槸涓€涓€滃儚 `openclaw-lark` 涓€鏍峰鏉傜殑澶ц€屽叏鎻掍欢鈥濓紝鑰屾槸涓€涓洿灏忕殑 **鑷畾涔?Channel 鎻掍欢**銆?
杩欎釜鎻掍欢鍦ㄦ灦鏋勪笂搴旇鎵紨锛?
- OpenClaw 閲岀殑涓€涓?`channel`
- `oneainexus-openclaw-chat` 鐨勪竴涓?SDK 瀹㈡埛绔?- 涓€涓妸 `SDKMessage(type=chat)` 杞垚 OpenClaw inbound锛屽啀鎶?OpenClaw reply 杞垚 `SDKMessage(type=chat_stream)` 鐨勬ˉ鎺ュ櫒

涓€鍙ヨ瘽姒傛嫭锛?
`娴忚鍣?-> oneainexus-openclaw-chat -> SDK -> 浣犵殑 OpenClaw 鎻掍欢 -> OpenClaw Agent -> 鎻掍欢 -> SDK -> oneainexus-openclaw-chat -> 娴忚鍣╜

---
## 涓€銆乣openclaw-lark` 杩欎釜椤圭洰鍒板簳鍦ㄥ仛浠€涔?
`openclaw-lark` 鍙互鎷嗘垚 5 灞傦細

### 1. 鎻掍欢娓呭崟灞?
- `openclaw.plugin.json`
- `package.json` 閲岀殑 `openclaw.channel`

杩欎竴灞傚憡璇?OpenClaw锛?
- 杩欐槸涓€涓彃浠?- 瀹冩毚闇蹭簡涓€涓?channel
- channel 鐨?id 鏄粈涔?- setup/full entry 鏄粈涔?- 鏈夊摢浜?skills

### 2. 鎻掍欢鍏ュ彛灞?
- `index.ts`

杩欎竴灞傚仛涓や欢浜嬶細

- 鍚?OpenClaw 娉ㄥ唽 channel
- 棰濆娉ㄥ唽 tools / commands / diagnostics

瀵逛綘鏉ヨ锛?*绗竴鐗堝彧闇€瑕佹敞鍐?channel锛屼笉闇€瑕佷竴涓婃潵鍋?tools 鍜?commands**銆?
### 3. Channel 瀹氫箟灞?
- `src/channel/plugin.ts`

杩欐槸鏍稿績涓殑鏍稿績銆傝繖閲屽畾涔変簡锛?
- channel `id` / `meta`
- `capabilities`
- `config`
- `security`
- `threading`
- `outbound`
- `gateway.startAccount`

杩欓儴鍒嗗氨鏄綘鐪熸瑕佲€滀豢鈥濈殑鍦版柟銆?
### 4. Inbound 鍏ュ彛鍜屼簨浠剁洃鍚眰

- `src/channel/monitor.ts`
- `src/channel/event-handlers.ts`
- `src/messaging/inbound/*`

Feishu 鎻掍欢閫氳繃骞冲彴浜嬩欢娴佹嬁鍒版秷鎭紝鐒跺悗锛?
1. 鎺ユ敹浜嬩欢
2. 鍘婚噸
3. 瑙ｆ瀽鍐呭
4. 鍋氭潈闄愬垽鏂?5. 灏佽鎴?OpenClaw 鑳界悊瑙ｇ殑 inbound context
6. 璋?OpenClaw reply pipeline

浣犵殑鎻掍欢涔熼渶瑕佸仛鍚屾牱鐨勪簨锛屽彧鏄簨浠舵潵婧愪笉鏄?Feishu WebSocket锛岃€屾槸浣犺嚜宸辩殑 SDK銆?
### 5. Outbound 鍥炲灞?
- `src/messaging/outbound/outbound.ts`
- `src/messaging/outbound/send.ts`

杩欎竴灞傝礋璐ｆ妸 OpenClaw 浜у嚭鐨勫洖澶嶇湡姝ｅ彂鍥炵洰鏍囧钩鍙般€?
Feishu 鎻掍欢鍙戠殑鏄細

- 鏂囨湰
- 鍗＄墖
- 鍥剧墖/鏂囦欢

浣犵殑鎻掍欢绗竴鐗堝彧闇€瑕佸彂锛?
- `chat_stream` 鍒嗙墖
- 鏈€缁?`done`

---

## 浜屻€佷綘鐨勭幇鏈夐」鐩紝宸茬粡鍏峰鍝簺鑳藉姏

浣犵幇鍦ㄧ殑浠ｇ爜鍏跺疄宸茬粡鎶娾€滃钩鍙颁晶鈥濆仛浜?70%銆?
### 1. `oneainexus-openclaw-chat` 宸茬粡鏄竴涓ˉ鎺ュ钩鍙?
瀹冨凡缁忔湁锛?
- 搴旂敤绠＄悊锛歚apps` 琛紝鐢熸垚 `clientId` / `clientSecret`
- SDK 杩炴帴绠＄悊锛歔`server/utils/sdkManager.ts`](D:\work\oneainexus-talk\oneainexus-openclaw-chat\server\utils\sdkManager.ts)
- SDK WebSocket 鍏ュ彛锛歔`server/api/_ws.ws.ts`](D:\work\oneainexus-talk\oneainexus-openclaw-chat\server\api\_ws.ws.ts)
- 鍓嶇鑱婂ぉ WebSocket锛歔`server/api/chat.ws.ts`](D:\work\oneainexus-talk\oneainexus-openclaw-chat\server\api\chat.ws.ts)
- HTTP 鑱婂ぉ鍏ュ彛锛歔`server/api/chat.post.ts`](D:\work\oneainexus-talk\oneainexus-openclaw-chat\server\api\chat.post.ts)

涔熷氨鏄锛屼綘鐨?Web Chat 鏈嶅姟宸茬粡鍦ㄥ仛锛?
- 鎺ユ祻瑙堝櫒娑堟伅
- 鏍规嵁 `appId` 鎵惧埌瀵瑰簲 SDK 杩炴帴
- 鎶婄敤鎴锋秷鎭箍鎾粰宸茶繛鎺ョ殑鈥滃簲鐢ㄧ鈥?- 鎺ユ敹搴旂敤绔洖鏉ョ殑 `chat_stream`
- 鍐嶈浆鍙戠粰娴忚鍣?
### 2. `oneainexus-chat-sdk` 宸茬粡鏄簲鐢ㄤ晶杩炴帴鍣?
浣犵殑 SDK 宸茬粡鏀寔锛?
- 寤虹珛 WS 闀胯繛鎺?- 鍙戦€?`auth`
- 鎺ユ敹 `auth_result`
- 鏀剁敤鎴?`chat`
- 鍙戝洖 `chat_stream`
- 蹇冭烦 / 鑷姩閲嶈繛

杩欐剰鍛崇潃锛?*鏈潵鐨?OpenClaw 鎻掍欢锛屾湰璐ㄤ笂鍙互鐩存帴澶嶇敤杩欎釜 SDK銆?*

### 3. 浣犵己鐨勪笉鏄€滆亰澶╂湇鍔♀€濓紝鑰屾槸鈥淥penClaw worker鈥?
鐜板湪缂虹殑鏄竴涓父椹荤粍浠讹細

- 鐢?`clientId/clientSecret` 杩炰笂 `oneainexus-openclaw-chat`
- 鏀跺埌鐢ㄦ埛娑堟伅鍚庤皟鐢?OpenClaw
- 鍐嶆妸 OpenClaw 鐨勫洖澶嶆祦寮忓啓鍥炲幓

杩欎釜甯搁┗缁勪欢鏈€鍚堥€傜殑褰㈡€侊紝灏辨槸涓€涓?OpenClaw channel plugin銆?
---

## 涓夈€佷綘搴旇鎬庝箞鏄犲皠鍒?OpenClaw 鐨勬彃浠舵ā鍨?
### 1. 璐﹀彿妯″瀷鎬庝箞鏄犲皠

寤鸿杩欐牱鏄犲皠锛?
- OpenClaw channel account = 浣犵殑涓€涓?`app`
- `accountId` = 浣犳彃浠跺唴閮ㄧ粰杩欎釜 app 鐨勯€昏緫璐﹀彿鍚?- `clientId/clientSecret/apiEndpoint` = 杩欎釜 account 鐨勯厤缃?
涔熷氨鏄細

```json
{
  "channels": {
    "oneainexus": {
      "accounts": {
        "default": {
          "apiEndpoint": "http://127.0.0.1:3000",
          "clientId": "oc_xxx",
          "clientSecret": "xxxx",
          "enabled": true
        }
      }
    }
  }
}
```

杩欐牱 OpenClaw 鑳藉ぉ鐒舵敮鎸侊細

- 澶?app
- 姣忎釜 app 涓€涓?SDK 杩炴帴
- 姣忎釜 app 鐙珛 session / 鐙珛 routing

### 2. Inbound 娑堟伅鎬庝箞鏄犲皠

浣犱粠 SDK 鏀跺埌鐨勬槸锛?
```ts
{
  type: 'chat',
  data: {
    sessionId,
    messages,
    stream
  }
}
```

浣犻渶瑕佹妸瀹冭浆鎴?OpenClaw 鐨?inbound 璇箟锛?
- channel: `oneainexus`
- accountId: 褰撳墠 app/account
- senderId: 寤鸿鐢?`session:${sessionId}`
- peer / to: 涔熷缓璁敤 `session:${sessionId}`
- body / rawBody: 鍙栨渶鍚庝竴鏉＄敤鎴锋秷鎭?- attachments/media: 浠?`parts` 琛嶇敓
- session key: 寤鸿涔熶互 `session:${sessionId}` 涓轰富

### 3. Outbound 鍥炲鎬庝箞鏄犲皠

OpenClaw 鐨勫洖澶嶆渶缁堣閲嶆柊杞洖 SDK锛?
```ts
{
  type: 'chat_stream',
  data: {
    sessionId,
    content,
    done,
    finishReason
  }
}
```

鎵€浠ヤ綘鑷繁鐨?outbound adapter 绗竴鐗堝彧瑕佹敮鎸侊細

- `sendText` -> 鍙戜竴涓?`chat_stream` chunk
- `sendPayload` -> 灏介噺闄嶇骇鎴愭枃鏈?/ parts
- 鏈€缁堝洖澶嶇粨鏉熸椂琛ヤ竴涓?`done: true`

### 4. Session 璺敱鎬庝箞璁捐

鏈€绋冲Ε鐨勬槸锛?
- `to = session:${sessionId}`
- 鎻掍欢鍐呴儴缁存姢 `target -> sessionId` 鐨勮В鏋?
涓嶈鎶?`appId` 娣疯繘 target锛屽洜涓哄綋鍓?account 宸茬粡闅愬惈浜嗗綋鍓?app銆?
---

## 鍥涖€佷綘搴旇浠?`openclaw-lark` 鐨勫摢浜涢儴鍒?
### 蹇呴』浠?
1. 鎻掍欢 manifest 鍜?entry
2. `ChannelPlugin` / `createChatChannelPlugin` 鐨?channel 瀹氫箟
3. `gateway.startAccount` 閲岀殑甯搁┗杩炴帴閫昏緫
4. inbound handler
5. outbound adapter

### 涓嶅缓璁涓€鐗堝氨浠?
1. skills
2. CLI commands
3. onboarding
4. pairing
5. rich card / reaction / directory
6. 寰堥噸鐨勫闃舵 inbound enrich pipeline

`openclaw-lark` 鏄珮绾у畬鏁村疄鐜帮紝浣犵幇鍦ㄦ洿鍍忚鍋氫竴涓€淲ebChat Bridge Channel鈥濄€?
---

## 浜斻€佹帹鑽愪綘鑷繁鎻掍欢鐨勭洰褰曠粨鏋?
寤鸿鍦?`oneainexu-openclaw-connector` 涓嬪仛鎴愯繖鏍凤細

```text
oneainexu-openclaw-connector/
  package.json
  openclaw.plugin.json
  index.ts
  setup-entry.ts
  tsconfig.json
  src/
    channel.ts
    sdk-client.ts
    runtime-store.ts
    inbound.ts
    outbound.ts
    types.ts
```

### 姣忎釜鏂囦欢鑱岃矗

#### `index.ts`

- 鎻掍欢 full entry
- `defineChannelPluginEntry(...)`

#### `setup-entry.ts`

- setup 妯″紡 entry
- `defineSetupPluginEntry(...)`

#### `src/channel.ts`

- channel 鍏冩暟鎹?- config schema
- account 瑙ｆ瀽
- gateway start/stop
- outbound adapter 鎸傝浇

#### `src/sdk-client.ts`

- 瀵?`@oneainexus/chat-sdk` 鐨勮交鍖呰
- 绠＄悊 connect / disconnect / reconnect / event subscription

#### `src/runtime-store.ts`

- 淇濆瓨 accountId -> sdkClient 鏄犲皠
- 淇濆瓨 sessionId -> route info 鏄犲皠

#### `src/inbound.ts`

- 鏀跺埌 SDK `chat` 鍚?- 鎻愬彇鏈€鍚庝竴鏉＄敤鎴锋秷鎭?- 鏄犲皠 `parts`
- 璋?OpenClaw inbound/reply pipeline

#### `src/outbound.ts`

- 鎶?OpenClaw 鐨?reply 鍙戝洖 `chat_stream`
- 璐熻矗 chunk / done / finishReason

---

## 鍏€佺涓€鐗堟渶灏忓彲鐢ㄥ疄鐜帮紙MVP锛夊簲璇ラ暱浠€涔堟牱

### 鐩爣鑳藉姏

鍙仛涓嬮潰杩欏嚑浠朵簨锛?
1. OpenClaw 鍚姩 channel account
2. 鎻掍欢鐢?SDK 杩炰笂浣犵殑 chat 鏈嶅姟
3. 鍓嶇鍙戞秷鎭悗锛屾彃浠舵敹鍒?`type=chat`
4. 鎻掍欢鎶婃秷鎭浆缁?OpenClaw
5. OpenClaw 鍥炲鏃讹紝鎻掍欢娴佸紡鍙戝洖 `type=chat_stream`
6. 鍓嶇椤甸潰姝ｅ父鏄剧ず娴佸紡鍥炲

### 绗竴鐗堝厛涓嶈鍋?
1. 澶氭ā鎬佷笂浼犲洖鍐?2. 鏂囦欢鎸佷箙鍖?3. pairing / 瀹℃壒
4. 鍛戒护绯荤粺
5. 缇よ亰
6. 鍥炲缂栬緫 / 涓柇鎺у埗

---

## 涓冦€佷竴涓洿閫傚悎浣犵殑瀹炵幇鏂瑰紡

瀵逛簬浣犺繖涓満鏅紝鎴戞洿寤鸿锛?
### 鏂规 A锛氫互瀹樻柟 `channel-core` builder 涓轰富

鐢ㄥ畼鏂规枃妗ｉ噷鐨勶細

- `createChannelPluginBase`
- `createChatChannelPlugin`
- `defineChannelPluginEntry`
- `defineSetupPluginEntry`

浼樼偣锛?
- 姣旂洿鎺ョ収鎶?`openclaw-lark/src/channel/plugin.ts` 绠€鍗曞緢澶?- 浣犵殑鍦烘櫙鏈潵灏辨瘮 Feishu 绠€鍗?- 鍚庣画鍐嶉€愭鏇挎崲鎴愯嚜瀹氫箟 adapter

### 鏂规 B锛氬彧鍦ㄢ€滄敹娑堟伅鈥濆拰鈥滃彂娑堟伅鈥濅袱涓偣鍋氳嚜瀹氫箟

涔熷氨鏄锛?
- channel 鍏冩暟鎹€佽处鍙疯В鏋愶紝璧?builder
- SDK 闀胯繛鎺ャ€佹秷鎭洃鍚紝鑷畾涔?- `chat_stream` 鍥炴帹锛岃嚜瀹氫箟

杩欐墠鏄渶灏忓疄鐜版垚鏈€?
---

## 鍏€佸缓璁殑浼唬鐮侀鏋?
### 1. `index.ts`

```ts
import { defineChannelPluginEntry } from 'openclaw/plugin-sdk/channel-core'
import { oneainexusPlugin } from './src/channel.js'

export default defineChannelPluginEntry({
  id: 'oneainexus',
  name: 'Oneainexus Chat',
  description: 'Bridge OpenClaw with oneainexus-openclaw-chat',
  plugin: oneainexusPlugin,
})
```

### 2. `src/channel.ts`

```ts
import {
  createChannelPluginBase,
  createChatChannelPlugin,
} from 'openclaw/plugin-sdk/channel-core'
import { startAccountWorker, stopAccountWorker } from './sdk-client.js'
import { oneainexusOutbound } from './outbound.js'

export const oneainexusPlugin = createChatChannelPlugin({
  base: createChannelPluginBase({
    id: 'oneainexus',
    setup: {
      resolveAccount(cfg, accountId) {
        const section = cfg.channels?.oneainexus?.accounts?.[accountId || 'default']
        if (!section?.apiEndpoint || !section?.clientId || !section?.clientSecret) {
          throw new Error('oneainexus account config is incomplete')
        }
        return {
          accountId: accountId || 'default',
          apiEndpoint: section.apiEndpoint,
          clientId: section.clientId,
          clientSecret: section.clientSecret,
        }
      },
    },
  }),
  outbound: {
    attachedResults: oneainexusOutbound,
  },
  gateway: {
    startAccount: async (ctx) => {
      await startAccountWorker(ctx)
    },
    stopAccount: async (ctx) => {
      await stopAccountWorker(ctx.accountId)
    },
  },
})
```

### 3. `src/sdk-client.ts`

```ts
import { OneainexusChatClient } from '@oneainexus/chat-sdk'
import { handleInboundSdkChat } from './inbound.js'
import { runtimeStore } from './runtime-store.js'

export async function startAccountWorker(ctx: any) {
  const account = ctx.account
  const client = new OneainexusChatClient({
    apiEndpoint: account.apiEndpoint,
    clientId: account.clientId,
    clientSecret: account.clientSecret,
    wsPath: '/api/_ws',
    enableAck: false,
  })

  client.onMessage(async (msg) => {
    if (msg.type !== 'chat') return
    await handleInboundSdkChat(ctx, client, msg)
  })

  await client.connect()
  runtimeStore.setClient(ctx.accountId, client)
}
```

### 4. `src/outbound.ts`

```ts
import { runtimeStore } from './runtime-store.js'

function parseTarget(to: string) {
  if (!to.startsWith('session:')) throw new Error(`invalid target: ${to}`)
  return { sessionId: to.slice('session:'.length) }
}

export const oneainexusOutbound = {
  sendText: async ({ accountId, to, text }) => {
    const { sessionId } = parseTarget(to)
    const client = runtimeStore.getClient(accountId)
    await client.sendStructuredMessage(
      {
        type: 'chat_stream',
        content: '',
        data: {
          sessionId,
          content: text,
          done: false,
        },
      },
      { waitForAck: false },
    )
    return { messageId: `${sessionId}:${Date.now()}` }
  },
}
```

涓婇潰鍙槸楠ㄦ灦锛屼絾鏂瑰悜鏄鐨勩€?
---

## 涔濄€佷綘褰撳墠浠ｇ爜閲岋紝蹇呴』鍏堜慨鐨勪袱涓棶棰?
杩欐槸鎴戣涓烘渶閲嶈鐨勯儴鍒嗐€?
### 闂 1锛歋DK 榛樿杩為敊浜?WebSocket 鍏ュ彛

鍦?[`src/client.ts`](D:\work\oneainexus-talk\oneainexus-chat-sdk\src\client.ts#L74) 閲岋紝榛樿閰嶇疆鏄細

```ts
wsPath: '/api/chat'
```

浣嗕綘鐪熸鐨?SDK 璁よ瘉鍏ュ彛鍦細

- [`server/api/_ws.ws.ts`](D:\work\oneainexus-talk\oneainexus-openclaw-chat\server\api\_ws.ws.ts#L1)

鑰屼笉鏄墠绔亰澶?WS銆?
杩欐剰鍛崇潃濡傛灉鎻掍欢鐩存帴澶嶇敤 SDK 榛樿閰嶇疆锛屽畠浼氳杩炲墠绔秷鎭€氶亾銆?
### 寤鸿

- 绔嬪埢鎶?SDK 榛樿 `wsPath` 鏀规垚 `/api/_ws`
- 鎴栬€呰嚦灏戝湪鎻掍欢閲屾樉寮忓啓姝?`wsPath: '/api/_ws'`

### 闂 2锛欰CK 鍗忚瀵逛笉涓?
浣犵殑 SDK 浼氬湪鍙戦€佸悗绛夊緟 ack銆?
鐪?[`src/client.ts`](D:\work\oneainexus-talk\oneainexus-chat-sdk\src\client.ts#L221) 涔嬪悗鐨勯€昏緫锛屽畠瑕佹眰锛?
- 鏈嶅姟绔繑鍥?`chat_received`
- 骞朵笖鏈€濂藉甫鍥炲師濮?`messageId`

浣嗗湪 [`server/api/_ws.ws.ts`](D:\work\oneainexus-talk\oneainexus-openclaw-chat\server\api\_ws.ws.ts#L135) 閲岋紝浣犵殑 ack 鍙湁锛?
```ts
{
  type: 'chat_received',
  id: crypto.randomUUID(),
  data: {
    sessionId: msg.data.sessionId,
    received: true
  }
}
```

娌℃湁鍘熸秷鎭?ID銆?
缁撴灉灏辨槸锛?
- SDK 鐨?`pendingAcks` 鏃犳硶鍛戒腑
- `sendMessage` / `sendStructuredMessage` 寰堝彲鑳借秴鏃?
### 寤鸿

浜岄€変竴锛?
1. 鎻掍欢閲屾殏鏃剁粺涓€ `enableAck: false` / `waitForAck: false`
2. 鏈嶅姟绔敼 ack 鏍煎紡锛屾樉寮忚繑鍥炲師濮?`msg.id`

鏇存帹鑽愮 2 绉嶏紝渚嬪锛?
```ts
peer.send(JSON.stringify({
  type: 'chat_received',
  id: crypto.randomUUID(),
  timestamp: Date.now(),
  data: {
    sessionId: msg.data.sessionId,
    messageId: msg.id,
    received: true,
  },
}))
```

---

## 鍗併€佷綘鐨勬秷鎭崗璁缓璁繖鏍锋敹鏁?
### 娴忚鍣?-> Chat 鏈嶅姟 -> 鎻掍欢

```ts
type: 'chat'
data: {
  sessionId: string
  messages: ChatMessage[]
  stream: true
}
```

### 鎻掍欢 -> Chat 鏈嶅姟 -> 娴忚鍣?
```ts
type: 'chat_stream'
data: {
  sessionId: string
  content: string
  done: boolean
  finishReason?: string
}
```

### 寤鸿琛ュ厖鐨勫瓧娈?
鍚庣画寤鸿琛ヨ繖鍑犱釜锛?
- `requestId`
- `messageId`
- `replyToMessageId`
- `metadata`
- `parts`
- `error.code`
- `error.message`

杩欐牱浠ュ悗浣犲仛锛?
- 涓柇
- 閲嶈瘯
- 鏂囦欢鍥炰紶
- 杩借釜鏃ュ織
- 骞傜瓑鍘婚噸

浼氳交鏉惧緢澶氥€?
---

## 鍗佷竴銆佸叿浣撳紑鍙戞楠ゅ缓璁?
### 绗?1 姝ワ細鍏堟妸鍗忚淇€?
鍏堜慨涓婇潰涓や釜闂锛?
- WS 榛樿璺緞
- ACK 瀵归綈

### 绗?2 姝ワ細鍒涘缓鏈€灏忔彃浠堕鏋?
鍏堝彧寤猴細

- `package.json`
- `openclaw.plugin.json`
- `index.ts`
- `setup-entry.ts`
- `src/channel.ts`

### 绗?3 姝ワ細鎺ュ叆 SDK worker

瀹屾垚锛?
- OpenClaw 鍚姩鏃惰嚜鍔?connect
- 鏀跺埌 `chat`
- 鎵撴棩蹇?- 鑳借瘑鍒?`sessionId`

### 绗?4 姝ワ細鎶?inbound 鎺ュ埌 OpenClaw reply pipeline

瀹屾垚锛?
- 鎻愬彇鏈€鍚庝竴鏉＄敤鎴锋秷鎭?- 鏋勯€?inbound context
- 璋?OpenClaw 鐢熸垚鍥炲

### 绗?5 姝ワ細瀹炵幇 outbound -> `chat_stream`

瀹屾垚锛?
- chunk 鎺ㄩ€?- done 鏀跺熬
- 閿欒钀藉洖鍓嶇

### 绗?6 姝ワ細鏈€鍚庡啀鍋氬寮洪」

- `parts` 澶氭ā鎬?- 涓柇
- 澶氳处鍙?- 浼氳瘽鎭㈠
- 璇婃柇鍛戒护

---

## 鍗佷簩銆佷竴涓緢閲嶈鐨勫垽鏂?
濡傛灉浣犵殑鐪熷疄鐩爣鍙槸鈥滃仛涓€涓嚜宸辩殑 Web 鑱婂ぉ鍓嶇鎺?OpenClaw鈥濓紝閭ｅ叾瀹?**涓嶄竴瀹氬繀椤诲啓 channel 鎻掍欢**銆?
鍥犱负 OpenClaw 瀹樻柟宸茬粡鏈?WebChat/Gateway WebSocket 杩欐潯璺紝鏂囨。閲屾槑纭彁鍒?WebChat UI 鐩存帴璧?Gateway WebSocket锛屽苟浣跨敤锛?
- `chat.history`
- `chat.send`
- `chat.inject`

濡傛灉浣犲彧鏄兂鍋?UI锛岃嚜瀹氫箟鍓嶇鐩存帴鎺?Gateway锛屽伐浣滈噺浼氭洿灏忋€?
浣嗗鏋滀綘鐨勭洰鏍囨槸锛?
- 鑷繁绠＄悊 app / clientId / secret
- 璁╁涓?app 閫氳繃 SDK 鎺ヨ繘鏉?- 鎶?`oneainexus-openclaw-chat` 鍋氭垚涓€涓€滃绉熸埛鑱婂ぉ骞冲彴鈥?
閭ｅ啓 channel plugin 鏄鐨勩€?
---

## 鍗佷笁銆佹垜鐨勬渶缁堝缓璁?
### 鏈€鎺ㄨ崘鐨勮矾绾?
1. 鍏堜笉瑕佺収鐫€ `openclaw-lark` 鍏ㄩ噺澶嶅埢
2. 鍙€熼壌瀹冪殑鈥滃垎灞傛€濊矾鈥?3. 鐪熸瀹炵幇鏃朵互 OpenClaw 瀹樻柟 `createChatChannelPlugin` 鏂囨。涓哄熀绾?4. 鎶婁綘鐨?SDK 浣滀负 channel 鐨?transport
5. 绗竴鐗堝彧鍋氭枃鏈祦寮忚亰澶╂墦閫?
### 浣犺繖鏉＄嚎閲岀殑瑙掕壊鍒嗗伐搴旇鏄?
- `oneainexus-openclaw-chat`: 骞冲彴渚?broker / session hub / 鍓嶇缃戝叧
- `oneainexus-chat-sdk`: transport client
- `oneainexu-openclaw-connector`: OpenClaw channel plugin
- OpenClaw: 鐪熸鐨?agent runtime

---

## 鍙傝€冮摼鎺?
- OpenClaw Channel Plugin 瀹樻柟鏂囨。: https://docs.openclaw.ai/plugins/sdk-channel-plugins
- OpenClaw WebChat 鏂囨。: https://docs.openclaw.ai/zh-CN/web/webchat
- `openclaw-lark` 浠撳簱: https://github.com/larksuite/openclaw-lark

