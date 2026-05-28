"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface ChatMessage {
    role: 'user' | 'ai'
    content: string
}

export function useChat(reportId: string | undefined) {
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [chatId, setChatId] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        // Clear state immediately to avoid showing stale messages from previous report
        setMessages([])
        setChatId(null)

        if (!reportId) return;

        const loadChat = async () => {
            setIsLoading(true)

            // 1. Try LocalStorage (Priority)
            const localKey = `chat_${reportId}`
            const localData = localStorage.getItem(localKey)
            if (localData) {
                setMessages(JSON.parse(localData))
            }

            // 2. Try Supabase (Sync/Backup) - Disabled for now
            /*
            if (navigator.onLine) {
                const { data, error } = await supabase
                    .from('chats')
                    .select('id, messages')
                    .eq('report_id', reportId)
                    .maybeSingle() // Use maybeSingle to avoid 406/JSON errors on empty

                if (data) {
                    setChatId(data.id)
                    // Conflict resolution: Server usually wins for chat history to keep consistency across devices
                    if (JSON.stringify(data.messages) !== localData) {
                        setMessages(data.messages || [])
                        localStorage.setItem(localKey, JSON.stringify(data.messages || []))
                    }
                } else if (error) {
                    console.error("Error loading chat from Supabase:", error)
                } else {
                    // No chat on server yet
                    if (!localData) {
                        setMessages([])
                        setChatId(null)
                    }
                }
            }
            */
            setIsLoading(false)
        }

        loadChat()
    }, [reportId])

    const saveMessages = async (updatedMessages: ChatMessage[]) => {
        // 1. Optimistic / Local Update
        setMessages(updatedMessages)
        if (reportId) {
            localStorage.setItem(`chat_${reportId}`, JSON.stringify(updatedMessages))
        }

        // 2. Sync to Supabase - Disabled for now
        /*
        if (!reportId || !navigator.onLine) return

        const payload = { report_id: reportId, messages: updatedMessages, updated_at: new Date().toISOString() }

        if (chatId) {
            await supabase
                .from('chats')
                .update({ messages: updatedMessages, updated_at: new Date().toISOString() })
                .eq('id', chatId)
        } else {
            // Create new
            const { data, error } = await supabase
                .from('chats')
                .insert([payload])
                .select()
                .single()

            if (data) setChatId(data.id)
            if (error) console.error("Error creating chat:", error)
        }
        */
    }

    const addMessage = (message: ChatMessage) => {
        const newMessages = [...messages, message]
        saveMessages(newMessages)
    }

    return { messages, addMessage, setMessages: saveMessages, isLoading }
}
