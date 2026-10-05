# 重新制作 public/Ledger Screenshot.shortcut（只有改快捷指令的动作时才需要）。要在 Mac 上跑：
#   python3 scripts/build-shortcut.py
#   shortcuts sign --mode anyone --input unsigned.shortcut --output "public/Ledger Screenshot.shortcut"
#   rm unsigned.shortcut
# 文件里不含任何网址或密钥：添加时 iPhone 会问用户贴上自己的“专属链接”。
import plistlib, uuid
U = lambda: str(uuid.uuid4()).upper()
u_link, u_shot, u_text, u_url, u_val = U(), U(), U(), U(), U()
def attach(uid, name):
    return {"Value": {"OutputUUID": uid, "Type": "ActionOutput", "OutputName": name}, "WFSerializationType": "WFTextTokenAttachment"}
def text(s):
    return {"Value": {"string": s}, "WFSerializationType": "WFTextTokenString"}
def var_text(uid, name):
    return {"Value": {"string": "￼", "attachmentsByRange": {"{0, 1}": {"OutputUUID": uid, "Type": "ActionOutput", "OutputName": name}}}, "WFSerializationType": "WFTextTokenString"}
def dict_field(items):
    return {"Value": {"WFDictionaryFieldValueItems": [{"WFItemType": 0, "WFKey": text(k), "WFValue": v} for k, v in items]}, "WFSerializationType": "WFDictionaryFieldValue"}
actions = [
 # 0: the user's personal capture link, filled in by the import question. No address or secret is stored in this file.
 {"WFWorkflowActionIdentifier": "is.workflow.actions.gettext", "WFWorkflowActionParameters": {"UUID": u_link, "WFTextActionText": ""}},
 {"WFWorkflowActionIdentifier": "is.workflow.actions.takescreenshot", "WFWorkflowActionParameters": {"UUID": u_shot}},
 {"WFWorkflowActionIdentifier": "is.workflow.actions.extracttextfromimage", "WFWorkflowActionParameters": {"UUID": u_text, "WFImage": attach(u_shot, "Screenshot")}},
 {"WFWorkflowActionIdentifier": "is.workflow.actions.downloadurl", "WFWorkflowActionParameters": {
    "UUID": u_url, "WFURL": var_text(u_link, "Text"), "WFHTTPMethod": "POST", "WFHTTPBodyType": "JSON", "ShowHeaders": True,
    "WFJSONValues": dict_field([("text", var_text(u_text, "Text from Image"))])}},
 {"WFWorkflowActionIdentifier": "is.workflow.actions.getvalueforkey", "WFWorkflowActionParameters": {"UUID": u_val, "WFInput": attach(u_url, "Contents of URL"), "WFDictionaryKey": "message"}},
 {"WFWorkflowActionIdentifier": "is.workflow.actions.notification", "WFWorkflowActionParameters": {"WFNotificationActionTitle": "Ledger", "WFNotificationActionBody": var_text(u_val, "Dictionary Value"), "WFNotificationActionSound": True}},
]
wf = {"WFWorkflowClientVersion": "2302.0.4", "WFWorkflowMinimumClientVersion": 900, "WFWorkflowMinimumClientVersionString": "900",
      "WFWorkflowIcon": {"WFWorkflowIconStartColor": 4274264319, "WFWorkflowIconGlyphNumber": 59511},
      "WFWorkflowImportQuestions": [{"ActionIndex": 0, "Category": "Parameter", "ParameterKey": "WFTextActionText", "DefaultValue": "",
          "Text": "Paste your personal link from the app (starts with https://). 贴上你在 App 里复制的专属链接。"}],
      "WFWorkflowTypes": [], "WFWorkflowInputContentItemClasses": [],
      "WFWorkflowHasOutputFallback": False, "WFWorkflowHasShortcutInputVariables": False, "WFWorkflowActions": actions}
plistlib.dump(wf, open("unsigned.shortcut", "wb"), fmt=plistlib.FMT_BINARY)
