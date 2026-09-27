
import { writable } from "svelte/store"
import { invoke } from "@tauri-apps/api/core"
import { listen } from '@tauri-apps/api/event'

export type JarvisState = "disconnected" | "idle" | "listening" | "processing"

export const jarvisState = writable<JarvisState>("disconnected")
export const ipcConnected = writable(false)
export const lastRecognizedText = writable("")
export const lastExecutedCommand = writable("")
export const lastError = writable("")
let enabled = false

export async function enableIpc() {
    enabled = true
    ipcConnected.set(true)
    jarvisState.set("idle")
    console.log("[IPC] Enabled (Tauri native)")
    

    await listen('jarvis-event', (event) => {
        handleEvent(event.payload)
    })
}

export function disableIpc() {
    enabled = false
    ipcConnected.set(false)
}

export async function runJarvisApp(): Promise<boolean> {
    try {
        console.log("[IPC] Запуск Jarvis Core...")
        await invoke('run_jarvis_app')
        jarvisState.set("idle")
        return true
    } catch (err) {
        console.error("[IPC] Ошибка запуска Jarvis:", err)
        lastError.set(String(err))
        return false
    }
}

export async function sendAction(action: string, payload: Record<string, any> = {}) {
    if (!enabled) {
        console.warn("[IPC] Not enabled")
        return false
    }

    try {
        await invoke('send_ipc_message', {
            message: { action, payload }
        })
        return true
    } catch (err) {
        console.error("[IPC] Error:", err)
        return false
    }
}

export async function sendTextCommand(text: string): Promise<boolean> {
    return sendAction("text_command", { text })
}

export async function stopJarvisApp(): Promise<boolean> {
    return sendAction("stop", {})
}

function handleEvent(data: any) {
    console.log("[IPC] Event:", data)
    if (data.event === 'listening') {
        jarvisState.set("listening")
    }
}


export function initIpc() {
    console.log("[IPC] Initializing (Tauri mode)")
    enableIpc()
}

initIpc()

export function connectIpc() {
    enableIpc();
}
export function disconnectIpc() {
    enabled = false;
    ipcConnected.set(false);
    jarvisState.set("disconnected");
    console.log("[IPC] Disconnected");
}

export async function sendIpcMessage(message: object): Promise<void> {

    if ('action' in message) {
        const msg = message as { action: string, payload?: Record<string, any> };
        await sendAction(msg.action, msg.payload || {});
    }
}

export function reloadCommands() {
    sendAction("reload_commands", {});
}
