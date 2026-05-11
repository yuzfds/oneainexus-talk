# 馃拵 OpenClaw Chat SDK 椤圭洰鏂规

> 鍌插▏澶у皬濮愬搱闆烽叡璁捐鐨勪笓涓歋DK锛岃姣忎釜鐢ㄦ埛閮芥湁鐙珛鐨勮亰澶╁鎴风锛?锟ｂ柦锟?锞?
---

## 椤圭洰姒傝堪

**椤圭洰鍚嶇О**: `@oneainexus/chat-sdk`

**椤圭洰瀹氫綅**: 鐙珛鐨?TypeScript SDK锛屼负涓嶅悓鐢ㄦ埛鎻愪緵鐙珛鐨勮亰澶╁鎴风瀹炰緥

**鏍稿績浠峰€?*: 閫氳繃 `client_id` 鍜?`secret` 鍖哄垎鐢ㄦ埛锛屽皝瑁?WebSocket 杩炴帴绠＄悊

---

## 涓€銆丼DK 鏋舵瀯璁捐

### 1.1 绯荤粺鏋舵瀯鍥?
```
鈹屸攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?鈹?                                                                鈹?鈹?                     馃寪 鐢ㄦ埛搴旂敤灞?                              鈹?鈹?                 鈹屸攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?                      鈹?鈹?                 鈹?  鐢ㄦ埛搴旂敤 A          鈹?                      鈹?鈹?                 鈹?  client_id: "app-a" 鈹?                      鈹?鈹?                 鈹斺攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?                      鈹?鈹?                            鈹?                                   鈹?鈹?                 鈹屸攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹粹攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?                      鈹?鈹?                 鈹?  鐢ㄦ埛搴旂敤 B          鈹?                      鈹?鈹?                 鈹?  client_id: "app-b" 鈹?                      鈹?鈹?                 鈹斺攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?                      鈹?鈹?                            鈹?                                   鈹?鈹斺攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹尖攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?                              鈹?                              鈻?鈹屸攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?鈹?                                                                鈹?鈹?                     馃拵 SDK 灞?                                  鈹?鈹?             鈹屸攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?                      鈹?鈹?             鈹? OpenClawChatClient (A)  鈹?鈫?瀹炰緥 A              鈹?鈹?             鈹? - client_id: "app-a"    鈹?                      鈹?鈹?             鈹? - secret: "secret-a"    鈹?                      鈹?鈹?             鈹? - 鐙珛鐨?WebSocket 杩炴帴  鈹?                      鈹?鈹?             鈹斺攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?                      鈹?鈹?             鈹屸攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?                      鈹?鈹?             鈹? OpenClawChatClient (B)  鈹?鈫?瀹炰緥 B              鈹?鈹?             鈹? - client_id: "app-b"    鈹?                      鈹?鈹?             鈹? - secret: "secret-b"    鈹?                      鈹?鈹?             鈹? - 鐙珛鐨?WebSocket 杩炴帴  鈹?                      鈹?鈹?             鈹斺攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?                      鈹?鈹?                            鈹?                                   鈹?鈹斺攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹尖攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?                              鈹?WebSocket / HTTP
                              鈻?鈹屸攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?鈹?                                                                鈹?鈹?                   馃洜锔?Chat 椤圭洰 (Nuxt3)                          鈹?鈹?             鈹屸攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?                      鈹?鈹?             鈹?      鍓嶇 (Vue3)         鈹?                      鈹?鈹?             鈹?  - 搴旂敤涓庡嚟璇佺鐞?        鈹?                      鈹?鈹?             鈹?  - 鐩戞帶鐪嬫澘涓庣晫闈?        鈹?                      鈹?鈹?             鈹?  - 鐢ㄦ埛鑱婂ぉ椤甸潰           鈹?                      鈹?鈹?             鈹斺攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?                      鈹?鈹?                        鈹?                                      鈹?鈹?             鈹屸攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹粹攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?                      鈹?鈹?             鈹?      鍚庣 (Nitro)        鈹?                      鈹?鈹?             鈹?  - API 涓庤璇佷腑闂翠欢       鈹?                      鈹?鈹?             鈹?  - WebSocket 杩炴帴绠＄悊    鈹?                      鈹?鈹?             鈹斺攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?                      鈹?鈹?                                                                鈹?鈹斺攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?```

### 1.2 鏍稿績璁捐鍘熷垯

```
鈹屸攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?鈹?                   馃敀 澶氱鎴烽殧绂?                             鈹?鈹? 鈹屸攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?  鈹?鈹? 鈹?姣忎釜 client_id + secret 缁勫悎鍒涘缓鐙珛鐨勫鎴风瀹炰緥        鈹?  鈹?鈹? 鈹?瀹炰緥涔嬮棿瀹屽叏闅旂锛氳繛鎺ャ€佹秷鎭€佺姸鎬併€佺洃鍚櫒              鈹?  鈹?鈹? 鈹斺攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?  鈹?鈹斺攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?                            鈹?鈹屸攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?鈹?                   馃攲 杩炴帴绠＄悊                                鈹?鈹? 鈹屸攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?  鈹?鈹? 鈹?鑷姩閲嶈繛鏈哄埗銆佸績璺虫娴嬨€佷紭闆呮柇寮€杩炴帴                  鈹?  鈹?鈹? 鈹?杩炴帴鐘舵€佸疄鏃堕€氱煡銆侀敊璇鐞嗕笌鎭㈠                      鈹?  鈹?鈹? 鈹斺攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?  鈹?鈹斺攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?                            鈹?鈹屸攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?鈹?                   馃摠 娑堟伅澶勭悊                                鈹?鈹? 鈹屸攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?  鈹?鈹? 鈹?浜嬩欢椹卞姩鐨勬秷鎭洃鍚€佹秷鎭‘璁ゆ満鍒?                     鈹?  鈹?鈹? 鈹?娑堟伅闃熷垪銆佸幓閲嶃€侀『搴忎繚璇?                            鈹?  鈹?鈹? 鈹斺攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?  鈹?鈹斺攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?                            鈹?鈹屸攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?鈹?                   馃幆 绫诲瀷瀹夊叏                                鈹?鈹? 鈹屸攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?  鈹?鈹? 鈹?瀹屾暣鐨?TypeScript 绫诲瀷瀹氫箟                           鈹?  鈹?鈹? 鈹?娉涘瀷鏀寔銆佷弗鏍肩殑绫诲瀷妫€鏌?                            鈹?  鈹?鈹? 鈹斺攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?  鈹?鈹斺攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?```

---

## 浜屻€侀」鐩粨鏋?
```
@oneainexus/chat-sdk/
鈹溾攢鈹€ src/
鈹?  鈹溾攢鈹€ index.ts                      # 馃摝 SDK 鍏ュ彛
鈹?  鈹?鈹?  鈹溾攢鈹€ client.ts                     # 馃挌 鏍稿績锛氬鎴风绫?鈹?  鈹?  # OpenClawChatClient
鈹?  鈹?鈹?  鈹溾攢鈹€ connection/                   # 馃寠 杩炴帴绠＄悊妯″潡
鈹?  鈹?  鈹溾攢鈹€ index.ts                  # 杩炴帴绠＄悊鍣?鈹?  鈹?  鈹溾攢鈹€ websocket.ts              # WebSocket 灏佽
鈹?  鈹?  鈹溾攢鈹€ heartbeat.ts              # 蹇冭烦鏈哄埗
鈹?  鈹?  鈹斺攢鈹€ reconnection.ts           # 閲嶈繛绛栫暐
鈹?  鈹?鈹?  鈹溾攢鈹€ auth/                         # 馃攼 璁よ瘉妯″潡
鈹?  鈹?  鈹溾攢鈹€ index.ts                  # 璁よ瘉绠＄悊鍣?鈹?  鈹?  鈹溾攢鈹€ token.ts                  # Token 绠＄悊
鈹?  鈹?  鈹斺攢鈹€ credentials.ts            # 鍑瘉楠岃瘉
鈹?  鈹?鈹?  鈹溾攢鈹€ message/                      # 馃摠 娑堟伅澶勭悊妯″潡
鈹?  鈹?  鈹溾攢鈹€ index.ts                  # 娑堟伅绠＄悊鍣?鈹?  鈹?  鈹溾攢鈹€ listener.ts               # 鐩戝惉鍣ㄧ鐞?鈹?  鈹?  鈹溾攢鈹€ queue.ts                  # 娑堟伅闃熷垪
鈹?  鈹?  鈹斺攢鈹€ ack.ts                    # 纭鏈哄埗
鈹?  鈹?鈹?  鈹溾攢鈹€ types/                        # 馃摑 绫诲瀷瀹氫箟
鈹?  鈹?  鈹溾攢鈹€ client.ts                 # 瀹㈡埛绔被鍨?鈹?  鈹?  鈹溾攢鈹€ config.ts                 # 閰嶇疆绫诲瀷
鈹?  鈹?  鈹溾攢鈹€ message.ts                # 娑堟伅绫诲瀷
鈹?  鈹?  鈹溾攢鈹€ events.ts                 # 浜嬩欢绫诲瀷
鈹?  鈹?  鈹斺攢鈹€ index.ts                  # 缁熶竴瀵煎嚭
鈹?  鈹?鈹?  鈹溾攢鈹€ utils/                        # 馃敡 宸ュ叿鍑芥暟
鈹?  鈹?  鈹溾攢鈹€ logger.ts                 # 鏃ュ織宸ュ叿
鈹?  鈹?  鈹溾攢鈹€ validator.ts              # 楠岃瘉宸ュ叿
鈹?  鈹?  鈹溾攢鈹€ emitter.ts                # 浜嬩欢鍙戝皠鍣?鈹?  鈹?  鈹斺攢鈹€ helpers.ts                # 杈呭姪鍑芥暟
鈹?  鈹?鈹?  鈹斺攢鈹€ config/                       # 鈿欙笍 閰嶇疆
鈹?      鈹溾攢鈹€ defaults.ts               # 榛樿閰嶇疆
鈹?      鈹斺攢鈹€ constants.ts              # 甯搁噺瀹氫箟
鈹?鈹溾攢鈹€ tests/                            # 鉁?娴嬭瘯
鈹?  鈹溾攢鈹€ unit/
鈹?  鈹?  鈹溾攢鈹€ client.test.ts
鈹?  鈹?  鈹溾攢鈹€ connection.test.ts
鈹?  鈹?  鈹斺攢鈹€ message.test.ts
鈹?  鈹斺攢鈹€ integration/
鈹?      鈹斺攢鈹€ sdk.test.ts
鈹?鈹溾攢鈹€ examples/                         # 馃摎 绀轰緥浠ｇ爜
鈹?  鈹溾攢鈹€ basic.ts                      # 鍩虹浣跨敤
鈹?  鈹溾攢鈹€ advanced.ts                   # 楂樼骇鐗规€?鈹?  鈹斺攢鈹€ react.tsx                     # React 闆嗘垚
鈹?鈹溾攢鈹€ docs/                             # 馃摉 鏂囨。
鈹?  鈹溾攢鈹€ API.md                        # API 鏂囨。
鈹?  鈹溾攢鈹€ GUIDE.md                      # 浣跨敤鎸囧崡
鈹?  鈹斺攢鈹€ ARCHITECTURE.md               # 鏋舵瀯璇存槑
鈹?鈹溾攢鈹€ package.json
鈹溾攢鈹€ tsconfig.json
鈹溾攢鈹€ vite.config.ts                    # Vite 閰嶇疆锛堢敤浜庢瀯寤猴級
鈹溾攢鈹€ README.md
鈹斺攢鈹€ LICENSE
```

---

## 涓夈€佹牳蹇?API 璁捐

### 3.1 瀹㈡埛绔厤缃帴鍙?
```typescript
/**
 * SDK 瀹㈡埛绔厤缃? */
export interface OpenClawClientConfig {
  // 馃攽 蹇呴渶锛氳璇佷俊鎭?  apiEndpoint: string          // API 绔偣锛屽: http://localhost:3000
  clientId: string             // 瀹㈡埛绔?ID锛岀敤浜庡尯鍒嗕笉鍚岀敤鎴?  clientSecret: string         // 瀹㈡埛绔瘑閽?
  // 鈿欙笍 鍙€夛細杩炴帴閰嶇疆
  wsPath?: string              // WebSocket 璺緞锛岄粯璁? /ws
  reconnect?: boolean          // 鏄惁鑷姩閲嶈繛锛岄粯璁? true
  reconnectInterval?: number   // 閲嶈繛闂撮殧锛堟绉掞級锛岄粯璁? 3000
  maxReconnectAttempts?: number // 鏈€澶ч噸杩炴鏁帮紝榛樿: 10
  heartbeatInterval?: number   // 蹇冭烦闂撮殧锛堟绉掞級锛岄粯璁? 30000

  // 馃摠 鍙€夛細娑堟伅閰嶇疆
  enableAck?: boolean          // 鏄惁鍚敤娑堟伅纭锛岄粯璁? true
  messageQueueSize?: number    // 娑堟伅闃熷垪澶у皬锛岄粯璁? 100
  messageTimeout?: number      // 娑堟伅瓒呮椂锛堟绉掞級锛岄粯璁? 60000

  // 馃搳 鍙€夛細鏃ュ織閰嶇疆
  logLevel?: 'debug' | 'info' | 'warn' | 'error' | 'silent'
}
```

### 3.2 鏍稿績瀹㈡埛绔被

```typescript
/**
 * OpenClaw Chat SDK 瀹㈡埛绔被
 *
 * 杩欐槸鏈皬濮愯璁＄殑鏍稿績绫伙紝绠＄悊鏁翠釜鑱婂ぉ瀹㈡埛绔殑鐢熷懡鍛ㄦ湡锛?锟ｂ柦锟?锞? */
export class OpenClawChatClient {
  // ========== 馃彈锔?鏋勯€犲嚱鏁?==========

  /**
   * 鍒涘缓瀹㈡埛绔疄渚?   * @param config 瀹㈡埛绔厤缃?   */
  constructor(config: OpenClawClientConfig)

  // ========== 馃攲 杩炴帴绠＄悊 ==========

  /**
   * 杩炴帴鍒版湇鍔″櫒
   * @returns Promise<void>
   */
  connect(): Promise<void>

  /**
   * 鏂紑杩炴帴
   * @param graceful 鏄惁浼橀泤鏂紑锛堢瓑寰呮秷鎭彂閫佸畬鎴愶級锛岄粯璁? true
   */
  disconnect(graceful?: boolean): Promise<void>

  /**
   * 鑾峰彇褰撳墠杩炴帴鐘舵€?   */
  getConnectionState(): ConnectionState

  // ========== 馃摠 娑堟伅鍙戦€?==========

  /**
   * 鍙戦€佽亰澶╂秷鎭?   * @param content 娑堟伅鍐呭
   * @param options 鍙€夊弬鏁?   */
  sendMessage(
    content: string,
    options?: SendMessageOptions
  ): Promise<SendMessageResult>

  /**
   * 鍙戦€佺粨鏋勫寲娑堟伅
   * @param message 娑堟伅瀵硅薄
   */
  sendStructuredMessage<T = unknown>(
    message: StructuredMessage<T>
  ): Promise<SendMessageResult>

  // ========== 馃憘 娑堟伅鐩戝惉 ==========

  /**
   * 娉ㄥ唽娑堟伅鐩戝惉鍣?   * @param listener 鐩戝惉鍣ㄥ嚱鏁?   * @returns 鍙栨秷鐩戝惉鐨勫嚱鏁?   */
  onMessage(
    listener: MessageListener
  ): () => void

  /**
   * 娉ㄥ唽涓€娆℃€ф秷鎭洃鍚櫒锛堣Е鍙戝悗鑷姩鍙栨秷锛?   * @param listener 鐩戝惉鍣ㄥ嚱鏁?   */
  onceMessage(
    listener: MessageListener
  ): void

  /**
   * 绉婚櫎娑堟伅鐩戝惉鍣?   * @param listener 瑕佺Щ闄ょ殑鐩戝惉鍣?   */
  offMessage(listener: MessageListener): void

  // ========== 馃搵 浜嬩欢鐩戝惉 ==========

  /**
   * 娉ㄥ唽杩炴帴鐘舵€佸彉鍖栫洃鍚櫒
   */
  onStateChange(
    listener: (state: ConnectionState) => void
  ): () => void

  /**
   * 娉ㄥ唽閿欒鐩戝惉鍣?   */
  onError(
    listener: (error: Error) => void
  ): () => void

  // ========== 馃攧 娑堟伅纭 ==========

  /**
   * 纭娑堟伅宸插鐞?   * @param messageId 娑堟伅 ID
   */
  acknowledge(messageId: string): Promise<void>

  /**
   * 鎵归噺纭娑堟伅
   * @param messageIds 娑堟伅 ID 鏁扮粍
   */
  acknowledgeBatch(messageIds: string[]): Promise<void>

  // ========== 馃搳 鐘舵€佹煡璇?==========

  /**
   * 鑾峰彇瀹㈡埛绔粺璁′俊鎭?   */
  getStats(): ClientStats

  /**
   * 鑾峰彇褰撳墠浼氳瘽淇℃伅
   */
  getSessionInfo(): SessionInfo | null
}
```

### 3.3 杩炴帴鐘舵€佹灇涓?
```typescript
/**
 * 杩炴帴鐘舵€佹灇涓? */
export enum ConnectionState {
  /** 鏈繛鎺?*/
  Disconnected = 'disconnected',

  /** 杩炴帴涓?*/
  Connecting = 'connecting',

  /** 宸茶繛鎺?*/
  Connected = 'connected',

  /** 閲嶈繛涓?*/
  Reconnecting = 'reconnecting',

  /** 杩炴帴閿欒 */
  Error = 'error',
}
```

### 3.4 娑堟伅绫诲瀷瀹氫箟

```typescript
/**
 * 鎺ユ敹鍒扮殑娑堟伅
 */
export interface ReceivedMessage {
  id: string                      // 娑堟伅鍞竴 ID
  type: 'text' | 'data'           // 娑堟伅绫诲瀷
  content: string                 // 鏂囨湰鍐呭
  data?: unknown                  // 闄勫姞鏁版嵁
  timestamp: number               // 鏃堕棿鎴?  sessionId: string               // 浼氳瘽 ID
  requiresAck: boolean            // 鏄惁闇€瑕佺‘璁?}

/**
 * 鍙戦€佹秷鎭€夐」
 */
export interface SendMessageOptions {
  sessionId?: string              // 浼氳瘽 ID
  metadata?: Record<string, unknown> // 鍏冩暟鎹?  timeout?: number                // 瓒呮椂鏃堕棿锛堟绉掞級
  waitForAck?: boolean            // 鏄惁绛夊緟纭
}

/**
 * 鍙戦€佹秷鎭粨鏋? */
export interface SendMessageResult {
  success: boolean                // 鏄惁鎴愬姛
  messageId?: string              // 娑堟伅 ID锛堟垚鍔熸椂锛?  error?: string                  // 閿欒淇℃伅锛堝け璐ユ椂锛?  timestamp: number               // 鍙戦€佹椂闂存埑
}

/**
 * 缁撴瀯鍖栨秷鎭? */
export interface StructuredMessage<T = unknown> {
  type: string                    // 娑堟伅绫诲瀷
  content: string                 // 鏂囨湰鍐呭
  data?: T                        // 闄勫姞鏁版嵁
  sessionId?: string              // 浼氳瘽 ID
  metadata?: Record<string, unknown> // 鍏冩暟鎹?}

/**
 * 娑堟伅鐩戝惉鍣? */
export type MessageListener = (
  message: ReceivedMessage,
  client: OpenClawChatClient
) => void | Promise<void>
```

### 3.5 浜嬩欢绫诲瀷瀹氫箟

```typescript
/**
 * 瀹㈡埛绔簨浠剁被鍨? */
export type ClientEvent =
  | 'connected'
  | 'disconnected'
  | 'reconnecting'
  | 'error'
  | 'message'
  | 'state-change'

/**
 * 浜嬩欢鐩戝惉鍣? */
export type EventListener<T = unknown> = (data: T) => void
```

---

## 鍥涖€佷娇鐢ㄧず渚?
### 4.1 鍩虹浣跨敤

```typescript
import { OneainexusChatClient } from '@oneainexus/chat-sdk'

// 鍒涘缓瀹㈡埛绔疄渚?const client = new OpenClawChatClient({
  apiEndpoint: 'http://localhost:3000',
  clientId: 'my-app-user-123',
  clientSecret: 'secret-key-abc123',
})

// 杩炴帴
await client.connect()

// 鐩戝惉娑堟伅
client.onMessage((message) => {
  console.log('鏀跺埌娑堟伅:', message.content)

  // 纭娑堟伅
  if (message.requiresAck) {
    client.acknowledge(message.id)
  }
})

// 鍙戦€佹秷鎭?const result = await client.sendMessage('浣犲ソ锛孫penClaw锛?)
console.log('鍙戦€佺粨鏋?', result)

// 鏂紑杩炴帴
await client.disconnect()
```

### 4.2 澶氬鎴风瀹炰緥

```typescript
// 鐢ㄦ埛 A 鐨勫鎴风
const clientA = new OpenClawChatClient({
  apiEndpoint: 'http://localhost:3000',
  clientId: 'user-a',
  clientSecret: 'secret-a',
})

// 鐢ㄦ埛 B 鐨勫鎴风
const clientB = new OpenClawChatClient({
  apiEndpoint: 'http://localhost:3000',
  clientId: 'user-b',
  clientSecret: 'secret-b',
})

// 涓や釜瀹㈡埛绔畬鍏ㄧ嫭绔?await clientA.connect()
await clientB.connect()

// 鐢ㄦ埛 A 鍙戦€佹秷鎭?clientA.onMessage((msg) => {
  console.log('鐢ㄦ埛 A 鏀跺埌:', msg.content)
})

// 鐢ㄦ埛 B 鍙戦€佹秷鎭?clientB.onMessage((msg) => {
  console.log('鐢ㄦ埛 B 鏀跺埌:', msg.content)
})

// 鐙珛鏂紑
await clientA.disconnect()
await clientB.disconnect()
```

### 4.3 React 闆嗘垚绀轰緥

```typescript
import { useEffect, useRef, useState } from 'react'
import { OneainexusChatClient, ConnectionState, ReceivedMessage } from '@oneainexus/chat-sdk'

export function useChatClient(config: OneainexusClientConfig) {
  const clientRef = useRef<OneainexusChatClient>()
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    ConnectionState.Disconnected
  )
  const [messages, setMessages] = useState<ReceivedMessage[]>([])

  useEffect(() => {
    // 鍒涘缓瀹㈡埛绔?    const client = new OneainexusChatClient(config)
    clientRef.current = client

    // 鐩戝惉杩炴帴鐘舵€?    client.onStateChange((state) => {
      setConnectionState(state)
    })

    // 鐩戝惉娑堟伅
    client.onMessage((message) => {
      setMessages((prev) => [...prev, message])

      // 鑷姩纭
      if (message.requiresAck) {
        client.acknowledge(message.id)
      }
    })

    // 杩炴帴
    client.connect()

    return () => {
      // 娓呯悊
      client.disconnect()
    }
  }, [config.clientId]) // 褰?clientId 鍙樺寲鏃堕噸鏂板垱寤?
  const sendMessage = async (content: string) => {
    if (!clientRef.current) return
    return clientRef.current.sendMessage(content)
  }

  return {
    connectionState,
    messages,
    sendMessage,
    isConnected: connectionState === ConnectionState.Connected,
  }
}

// 浣跨敤
function ChatComponent() {
  const { connectionState, messages, sendMessage, isConnected } = useChatClient({
    apiEndpoint: 'http://localhost:3000',
    clientId: 'react-app-user',
    clientSecret: 'secret-key',
  })

  return (
    <div>
      <div>鐘舵€? {connectionState}</div>
      <ul>
        {messages.map((msg) => (
          <li key={msg.id}>{msg.content}</li>
        ))}
      </ul>
      <button
        disabled={!isConnected}
        onClick={() => sendMessage('Hello!')}
      >
        鍙戦€佹秷鎭?      </button>
    </div>
  )
}
```

### 4.4 楂樼骇閰嶇疆

```typescript
const client = new OpenClawChatClient({
  // 鍩虹閰嶇疆
  apiEndpoint: 'http://localhost:3000',
  clientId: 'advanced-user',
  clientSecret: 'secret-key',

  // 杩炴帴閰嶇疆
  wsPath: '/ws',
  reconnect: true,
  reconnectInterval: 5000,
  maxReconnectAttempts: 20,
  heartbeatInterval: 30000,

  // 娑堟伅閰嶇疆
  enableAck: true,
  messageQueueSize: 200,
  messageTimeout: 120000,

  // 鏃ュ織閰嶇疆
  logLevel: 'debug',
})

// 鐩戝惉鎵€鏈変簨浠?client.onStateChange((state) => {
  console.log('鐘舵€佸彉鍖?', state)
})

client.onError((error) => {
  console.error('鍙戠敓閿欒:', error)
})

// 鑾峰彇缁熻淇℃伅
const stats = client.getStats()
console.log('缁熻:', stats)
// {
//   connectedAt: 1234567890,
//   messagesSent: 42,
//   messagesReceived: 38,
//   reconnectCount: 2,
//   lastHeartbeatAt: 1234567990,
// }
```

---

## 浜斻€佷緷璧栭厤缃?
### 5.1 package.json

```json
{
  "name": "@oneainexus/chat-sdk",
  "version": "1.0.0",
  "description": "OpenClaw Chat SDK - 澶氱鎴疯亰澶╁鎴风 SDK",
  "main": "dist/index.js",
  "module": "dist/index.esm.js",
  "types": "dist/index.d.ts",
  "files": [
    "dist"
  ],
  "scripts": {
    "dev": "vite build --watch",
    "build": "vite build && tsc --emitDeclarationOnly",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "lint": "eslint src --ext .ts",
    "prepublishOnly": "npm run build"
  },
  "keywords": [
    "openclaw",
    "chat",
    "sdk",
    "websocket",
    "realtime"
  ],
  "author": "Your Name",
  "license": "MIT",
  "peerDependencies": {},
  "dependencies": {},
  "devDependencies": {
    "@types/node": "^20.11.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "vitest": "^1.0.0",
    "@vitest/ui": "^1.0.0",
    "eslint": "^8.56.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0"
  }
}
```

### 5.2 tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM"],
    "moduleResolution": "bundler",
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### 5.3 vite.config.ts

```typescript
import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'OpenClawChatSDK',
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format === 'es' ? 'esm' : 'cjs'}.js`,
    },
    rollupOptions: {
      output: {
        globals: {},
      },
    },
    minify: true,
    sourcemap: true,
  },
  test: {
    globals: true,
    environment: 'node',
  },
})
```

---

## 鍏€佸彂甯冧笌浣跨敤

### 6.1 鏈湴寮€鍙?
```bash
# 鏋勫缓
npm run build

# 鍦ㄥ叾浠栭」鐩腑鏈湴娴嬭瘯
cd ../my-project
npm link ../oneainexus-chat-sdk
```

### 6.2 鍙戝竷鍒?npm

```bash
# 鍙戝竷
npm publish

# 鍏朵粬椤圭洰瀹夎浣跨敤
npm install @oneainexus/chat-sdk
```

---

