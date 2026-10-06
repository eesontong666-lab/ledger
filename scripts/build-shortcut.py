# 重新制作 public/Ledger Screenshot.shortcut（只有改快捷指令的动作时才需要）。要在 Mac 上跑：
#   python3 scripts/build-shortcut.py
#   shortcuts sign --mode anyone --input unsigned.shortcut --output "public/Ledger Screenshot.shortcut"
#   rm unsigned.shortcut
# 文件里不含任何网址或密钥：添加时 iPhone 会问用户贴上自己的“专属链接”。
#
# 流程：截屏 → 提取文字 → POST 到专属链接 → 通知结果
#       → 如果服务器回了 ask_account（不知道用哪个账户）→ 弹出账户选单 → POST 到 专属链接/account → 通知
#       → 如果服务器回了 ask（分类拿不准）→ 弹出分类选单 → POST 到 专属链接/category → 通知
import plistlib, uuid

U = lambda: str(uuid.uuid4()).upper()
u_link, u_shot, u_text, u_res, u_msg, u_ask = U(), U(), U(), U(), U(), U()
u_q, u_choices, u_pick, u_id, u_rem, u_res2, u_msg2 = U(), U(), U(), U(), U(), U(), U()
u_aask, u_aq, u_achoices, u_apick, u_ids, u_res3, u_msg3 = U(), U(), U(), U(), U(), U(), U()
group = U()
group_account = U()

def attach(uid, name):
    return {"Value": {"OutputUUID": uid, "Type": "ActionOutput", "OutputName": name}, "WFSerializationType": "WFTextTokenAttachment"}

def text(s):
    return {"Value": {"string": s}, "WFSerializationType": "WFTextTokenString"}

def var_text(uid, name, suffix=""):
    return {"Value": {"string": "￼" + suffix, "attachmentsByRange": {"{0, 1}": {"OutputUUID": uid, "Type": "ActionOutput", "OutputName": name}}}, "WFSerializationType": "WFTextTokenString"}

def dict_field(items):
    return {"Value": {"WFDictionaryFieldValueItems": [{"WFItemType": 0, "WFKey": text(k), "WFValue": v} for k, v in items]}, "WFSerializationType": "WFDictionaryFieldValue"}

def action(identifier, **params):
    return {"WFWorkflowActionIdentifier": "is.workflow.actions." + identifier, "WFWorkflowActionParameters": params}

def get_value(uid, key, source_uid):
    return action("getvalueforkey", UUID=uid, WFInput=attach(source_uid, "Contents of URL"), WFDictionaryKey=key)

def post(uid, url, fields):
    return action("downloadurl", UUID=uid, WFURL=url, WFHTTPMethod="POST", WFHTTPBodyType="JSON", ShowHeaders=True, WFJSONValues=dict_field(fields))

def notify(uid):
    return action("notification", WFNotificationActionTitle="Ledger", WFNotificationActionBody=var_text(uid, "Dictionary Value"), WFNotificationActionSound=True)

actions = [
    # 0: 用户的专属链接，由导入问题填入
    action("gettext", UUID=u_link, WFTextActionText=""),
    action("takescreenshot", UUID=u_shot),
    action("extracttextfromimage", UUID=u_text, WFImage=attach(u_shot, "Screenshot")),
    post(u_res, var_text(u_link, "Text"), [("text", var_text(u_text, "Text from Image"))]),
    get_value(u_msg, "message", u_res),
    notify(u_msg),
    # 服务器不知道用哪个账户付的时候才会回 ask_account
    get_value(u_aask, "ask_account", u_res),
    action("conditional", GroupingIdentifier=group_account, WFControlFlowMode=0, WFCondition=100,
           WFInput={"Type": "Variable", "Variable": attach(u_aask, "Dictionary Value")}),
    get_value(u_aq, "account_question", u_res),
    get_value(u_achoices, "account_choices", u_res),
    action("choosefromlist", UUID=u_apick, WFInput=attach(u_achoices, "Dictionary Value"),
           WFChooseFromListActionPrompt=var_text(u_aq, "Dictionary Value")),
    get_value(u_ids, "ids", u_res),
    post(u_res3, var_text(u_link, "Text", "/account"), [
        ("ids", var_text(u_ids, "Dictionary Value")),
        ("account", var_text(u_apick, "Chosen Item")),
    ]),
    get_value(u_msg3, "message", u_res3),
    notify(u_msg3),
    action("conditional", GroupingIdentifier=group_account, WFControlFlowMode=2, UUID=U()),
    # 服务器只有在分类拿不准时才会回 ask；没有这个值就到此结束
    get_value(u_ask, "ask", u_res),
    action("conditional", GroupingIdentifier=group, WFControlFlowMode=0, WFCondition=100,
           WFInput={"Type": "Variable", "Variable": attach(u_ask, "Dictionary Value")}),
    get_value(u_q, "question", u_res),
    get_value(u_choices, "choices", u_res),
    action("choosefromlist", UUID=u_pick, WFInput=attach(u_choices, "Dictionary Value"),
           WFChooseFromListActionPrompt=var_text(u_q, "Dictionary Value")),
    get_value(u_id, "id", u_res),
    get_value(u_rem, "remember", u_res),
    post(u_res2, var_text(u_link, "Text", "/category"), [
        ("id", var_text(u_id, "Dictionary Value")),
        ("category", var_text(u_pick, "Chosen Item")),
        ("remember", var_text(u_rem, "Dictionary Value")),
    ]),
    get_value(u_msg2, "message", u_res2),
    notify(u_msg2),
    action("conditional", GroupingIdentifier=group, WFControlFlowMode=2, UUID=U()),
]

workflow = {
    "WFWorkflowClientVersion": "2302.0.4",
    "WFWorkflowMinimumClientVersion": 900,
    "WFWorkflowMinimumClientVersionString": "900",
    "WFWorkflowIcon": {"WFWorkflowIconStartColor": 4274264319, "WFWorkflowIconGlyphNumber": 59511},
    "WFWorkflowImportQuestions": [{
        "ActionIndex": 0, "Category": "Parameter", "ParameterKey": "WFTextActionText", "DefaultValue": "",
        "Text": "Paste your personal link from the app (starts with https://). 贴上你在 App 里复制的专属链接。",
    }],
    "WFWorkflowTypes": [],
    "WFWorkflowInputContentItemClasses": [],
    "WFWorkflowHasOutputFallback": False,
    "WFWorkflowHasShortcutInputVariables": False,
    "WFWorkflowActions": actions,
}
plistlib.dump(workflow, open("unsigned.shortcut", "wb"), fmt=plistlib.FMT_BINARY)
print("wrote unsigned.shortcut with", len(actions), "actions")
