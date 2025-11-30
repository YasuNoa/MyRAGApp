ログイン
LINEでログインした場合、
LineのログインAPIが起動し、
LINEのOauth認証が走って、トークンを取得し、
DBにUserとAccountをPOSTする。

Googleでログインした場合、
GoogleのログインAPIが起動して、Google APIから発行されやトークンを取得し
DBにUser(無ければ)とAccountをPOSTする。

mailでアカウントを新規作成した場合は、Userモデルに情報を登録し、Accountにも登録。
(jwt?)トークンを発行して、ログインを許可する。
DBにUserとAccountをPOSTする。

知識登録
知識登録は、テキストを入力し、保存すると、PosgreにDocumentに知識をPOSTし、次にGeminiでベクトル化し、それをPinecornにPOSTする。

チャットは、ユーザからチャットが送られると、Geminiにチャット送信され、GeminiがPinecornの内容をGETし、チャットにPOSTする。
場合によってはDBもGETしに行くかな。

