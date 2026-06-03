# SignWell: agent auto-sign vs client signing

## Do you configure the agent in SignWell?

**No.** The migration agent does **not** need to be a SignWell recipient.

| Who | How they sign |
|-----|----------------|
| **Agent (you)** | Signature is captured in ImmiSign (RMA Team settings). On send, we store an **Agent-Certification.pdf** and metadata. SignWell is **not** asked to collect the agent signature again. |
| **Client / sponsor / witness** | Listed as **external signers** only. SignWell emails them a **real** `Review & Sign` link after dispatch. |

If you add your own email as a signer, the app removes you when it matches the logged-in sender (or agent role).

---

## Email preview vs real link

The **Review & Sign** button on step 4 (Email) is a **mock inbox preview** only. It does not open SignWell. After a successful send, recipients get the link from **SignWell’s email**.

---

## Signature placement

On send we pass SignWell **fields** on the **last page** of your uploaded PDF (signature + date per external signer). The **Agent-Certification** PDF is attached for audit but has **no** SignWell fields (agent already signed).

For precise placement inside the PDF, embed SignWell **text tags** in the file before upload, for example:

```text
{{signature:signer_1}}
{{date:signer_1}}
```

Recipient `id` in the send payload must match the tag (e.g. `signer_1` for the first external signer). Enable `text_tags: true` is already set on dispatch.

---

## Error: “document isn’t draft”

This happened when `/send` was called on a document SignWell had already moved out of draft (retry or race). The app now:

- Creates with `draft: true`, then sends only if status is still `Draft`
- Treats already-sent documents as success on retry
- Resumes an existing `signwell_document_id` if still draft

---

## CC me / same email as client

Uncheck **CC me** when testing with your own email as the client signer — SignWell rejects duplicate addresses across recipients and copied contacts.
