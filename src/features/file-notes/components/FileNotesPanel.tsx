"use client"

import { FileNotesWorkspace } from "./FileNotesWorkspace"
import type { ClientSearchResult } from "./ClientSearchInput"

import type { ClientFileSource } from "../services/client-files.service"

export function FileNotesPanel({
  clientId,
  clientName,
  clientNumber,
  clientEmail,
  clientPhone,
  initialFileSource,
  initialFileId,
  canAdd = true,
}: {
  clientId: string
  clientName?: string
  clientNumber?: string | null
  clientEmail?: string
  clientPhone?: string | null
  initialFileSource?: ClientFileSource
  initialFileId?: string
  canAdd?: boolean
}) {
  const initialClient: ClientSearchResult = {
    id: clientId,
    name: clientName || "Client",
    email: clientEmail || "",
    phone: clientPhone,
    client_number: clientNumber,
    active_file_count: 0,
  }

  return (
    <FileNotesWorkspace
      initialClient={initialClient}
      initialFileSource={initialFileSource}
      initialFileId={initialFileId}
      canAdd={canAdd}
    />
  )
}
