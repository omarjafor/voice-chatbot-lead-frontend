"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Input } from "@/components/ui/input"
import { Mic, MicOff, Volume2, VolumeX, User, Keyboard } from "lucide-react"
import { cn } from "@/lib/utils"

interface Message {
  role: "user" | "agent"
  content: string
  timestamp: Date
}

interface AgentConfig {
  name: string
  gender: "male" | "female"
  voiceIndex: number
  pitch: number
  rate: number
}

const AGENTS: AgentConfig[] = [
  { name: "Sarah", gender: "female", voiceIndex: 0, pitch: 1.2, rate: 0.95 },
  { name: "Emma", gender: "female", voiceIndex: 1, pitch: 1.1, rate: 1.0 },
  { name: "Lisa", gender: "female", voiceIndex: 2, pitch: 1.15, rate: 0.9 },
  { name: "David", gender: "male", voiceIndex: 3, pitch: 0.85, rate: 0.95 },
  { name: "James", gender: "male", voiceIndex: 4, pitch: 0.9, rate: 1.0 },
  { name: "Alex", gender: "male", voiceIndex: 5, pitch: 0.8, rate: 0.9 },
]

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [selectedAgent, setSelectedAgent] = useState<AgentConfig>(AGENTS[0])
  const [showAgentSelection, setShowAgentSelection] = useState(true)
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([])
  const [manualInputMode, setManualInputMode] = useState(false)
  const [textInput, setTextInput] = useState("")
  const [noSpeechTimeout, setNoSpeechTimeout] = useState<NodeJS.Timeout | null>(null)

  const shouldAutoStartRef = useRef(false)
  const recognitionRef = useRef<any>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const isAutoStartingRef = useRef(false)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis

      // Load voices
      const loadVoices = () => {
        const voices = synthRef.current?.getVoices() || []
        setAvailableVoices(voices)
      }

      loadVoices()
      if (synthRef.current) {
        synthRef.current.onvoiceschanged = loadVoices
      }
    }
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition()
        recognitionRef.current.continuous = false
        recognitionRef.current.interimResults = false
        recognitionRef.current.lang = "en-US"

        recognitionRef.current.onresult = (event: any) => {
          // Clear no-speech timeout
          if (noSpeechTimeout) {
            clearTimeout(noSpeechTimeout)
            setNoSpeechTimeout(null)
          }

          const transcript = event.results[0][0].transcript
          console.log("Speech recognized:", transcript)
          handleUserMessage(transcript)
        }

        recognitionRef.current.onerror = (event: any) => {
          console.log("Speech recognition error:", event.error)

          // Clear no-speech timeout
          if (noSpeechTimeout) {
            clearTimeout(noSpeechTimeout)
            setNoSpeechTimeout(null)
          }

          // Handle no-speech error gracefully
          if (event.error === "no-speech") {
            setError("I didn't hear anything. Please click the Speak button to try again.")
          } else if (event.error === "aborted") {
            // Silently handle aborted errors (user stopped speaking)
            console.log("Recognition aborted, will auto-restart if needed")
          } else {
            setError(`Speech recognition error: ${event.error}`)
          }
          setIsListening(false)
          isAutoStartingRef.current = false
        }

        recognitionRef.current.onend = () => {
          console.log("Speech recognition ended")
          setIsListening(false)
          isAutoStartingRef.current = false
          // Clear no-speech timeout
          if (noSpeechTimeout) {
            clearTimeout(noSpeechTimeout)
            setNoSpeechTimeout(null)
          }
        }
      } else {
        setError("Speech recognition is not supported in this browser.")
      }
    }
  }, [sessionId, noSpeechTimeout])

  useEffect(() => {
    return () => {
      if (noSpeechTimeout) {
        clearTimeout(noSpeechTimeout)
      }
    }
  }, [noSpeechTimeout])

  const startChat = async () => {
    try {
      setError(null)
      setShowAgentSelection(false)

      const response = await fetch(`${API_URL}/api/chat/start`, {
        method: "POST",
      })

      if (!response.ok) throw new Error("Failed to start chat")

      const data = await response.json()
      setSessionId(data.session_id)

      const greeting = `Hello! I'm ${selectedAgent.name}, your virtual assistant. ${data.message}`

      const agentMessage: Message = {
        role: "agent",
        content: greeting,
        timestamp: new Date(),
      }
      setMessages([agentMessage])

      if (audioEnabled) {
        shouldAutoStartRef.current = true
        speak(greeting)
      } else {
        shouldAutoStartRef.current = false
      }
    } catch (err) {
      setError("Failed to connect to backend. Make sure the server is running.")
      console.error(err)
    }
  }

  // Handle user message
  const handleUserMessage = async (userText: string) => {
    if (!sessionId || isComplete) return

    const userMessage: Message = {
      role: "user",
      content: userText,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMessage])
    setTextInput("") // Clear text input

    try {
      const response = await fetch(`${API_URL}/api/chat/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          message: userText,
        }),
      })

      if (!response.ok) throw new Error("Failed to send message")

      const data = await response.json()

      const agentMessage: Message = {
        role: "agent",
        content: data.agent_message,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, agentMessage])

      // Check if we should enable manual input mode
      if (data.validation_error === "max_retries_email" || data.validation_error === "max_retries_phone") {
        setManualInputMode(true)
        shouldAutoStartRef.current = false
      } else {
        // Clear manual input mode if no max retries error
        setManualInputMode(false)
      }

      // Handle conversation completion
      if (data.is_complete) {
        setIsComplete(true)
        shouldAutoStartRef.current = false
      } else {
        // Set auto-listen based on backend response (MUST be after completion check)
        shouldAutoStartRef.current = data.should_auto_listen !== false && audioEnabled && !manualInputMode
      }

      // Always speak the agent's response if audio is enabled
      if (audioEnabled) {
        speak(data.agent_message)
      }
    } catch (err) {
      setError("Failed to send message")
      console.error(err)
    }
  }

  const speak = (text: string) => {
    if (!synthRef.current) return

    // Cancel any ongoing speech
    synthRef.current.cancel()
    
    const utterance = new SpeechSynthesisUtterance(text)

    let selectedVoice: SpeechSynthesisVoice | null = null

    if (availableVoices.length > 0) {
      // Improved voice filtering by gender
      const genderFilteredVoices = availableVoices.filter((v) => {
        const voiceName = v.name.toLowerCase()
        const voiceLang = v.lang.toLowerCase()
        
        // Only use English voices
        const isEnglish = voiceLang.includes('en-us') || voiceLang.includes('en-gb') || voiceLang.includes('en')
        
        if (!isEnglish) return false
        
        if (selectedAgent.gender === "female") {
          return (
            voiceName.includes('female') ||
            voiceName.includes('samantha') ||
            voiceName.includes('zira') ||
            voiceName.includes('victoria') ||
            voiceName.includes('karen') ||
            voiceName.includes('moira') ||
            voiceName.includes('fiona') ||
            voiceName.includes('tessa') ||
            voiceName.includes('susan') ||
            voiceName.includes('allison') ||
            (voiceName.includes('google') && voiceName.includes('female')) ||
            (!voiceName.includes('male') && (
              voiceName.includes('google us') || 
              voiceName.includes('google uk') ||
              voiceName.includes('microsoft')
            ))
          )
        } else {
          // Better male voice filtering
          return (
            voiceName.includes('male') ||
            voiceName.includes('david') ||
            voiceName.includes('daniel') ||
            voiceName.includes('james') ||
            voiceName.includes('alex') ||
            voiceName.includes('fred') ||
            voiceName.includes('jorge') ||
            voiceName.includes('thomas') ||
            voiceName.includes('oliver') ||
            (voiceName.includes('google') && voiceName.includes('male'))
          )
        }
      })

      console.log(`Available ${selectedAgent.gender} voices:`, genderFilteredVoices.map(v => v.name))

      // Use the voice index to select from filtered voices
      if (genderFilteredVoices.length > 0) {
        const voiceIdx = selectedAgent.voiceIndex % genderFilteredVoices.length
        selectedVoice = genderFilteredVoices[voiceIdx]
        console.log(`Selected voice: ${selectedVoice.name}`)
      } else {
        // Fallback to any available voice
        console.log("No gender-filtered voices found, using fallback")
        selectedVoice = availableVoices[selectedAgent.voiceIndex % availableVoices.length]
      }
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice
    }

    utterance.rate = selectedAgent.rate
    utterance.pitch = selectedAgent.pitch

    utterance.onstart = () => {
      console.log("Speech synthesis started")
      setIsSpeaking(true)
    }

    utterance.onend = () => {
      console.log("Speech synthesis ended")
      console.log("shouldAutoStart:", shouldAutoStartRef.current)
      console.log("audioEnabled:", audioEnabled)
      console.log("isComplete:", isComplete)
      console.log("manualInputMode:", manualInputMode)
      
      setIsSpeaking(false)

      // Auto-start speech recognition if all conditions are met
      if (shouldAutoStartRef.current && audioEnabled && !isComplete && !manualInputMode && !isAutoStartingRef.current) {
        console.log("✅ Auto-starting speech recognition...")
        isAutoStartingRef.current = true

        // Shorter delay for more natural conversation flow
        setTimeout(() => {
          if (recognitionRef.current && !isListening) {
            try {
              recognitionRef.current.start()
              setIsListening(true)
              setError(null)
              console.log("🎤 Microphone activated, listening...")

              // 12 seconds timeout for user response
              const timeout = setTimeout(() => {
                if (isListening && recognitionRef.current) {
                  console.log("⏰ No speech detected, stopping recognition")
                  recognitionRef.current.stop()
                  setError("I didn't hear you. Please click the Speak button when you're ready to answer.")
                  setIsListening(false)
                  isAutoStartingRef.current = false
                }
              }, 12000)
              setNoSpeechTimeout(timeout)
            } catch (error) {
              console.error("❌ Error starting recognition:", error)
              isAutoStartingRef.current = false
              
              // Retry once after a short delay
              setTimeout(() => {
                if (recognitionRef.current && !isListening && shouldAutoStartRef.current) {
                  try {
                    console.log("🔄 Retrying speech recognition...")
                    recognitionRef.current.start()
                    setIsListening(true)
                    isAutoStartingRef.current = false
                  } catch (retryError) {
                    console.error("❌ Retry failed:", retryError)
                    isAutoStartingRef.current = false
                  }
                }
              }, 500)
            }
          } else {
            isAutoStartingRef.current = false
          }
        }, 800) // Reduced delay for smoother experience
      } else {
        console.log("❌ Auto-start conditions not met")
      }
    }

    utterance.onerror = (event) => {
      console.error("Speech synthesis error:", event)
      setIsSpeaking(false)
    }

    synthRef.current.speak(utterance)
  }

  const toggleListening = () => {
    if (!recognitionRef.current) {
      setError("Speech recognition not available")
      return
    }

    if (isListening) {
      console.log("Manually stopping speech recognition")
      recognitionRef.current.stop()
      setIsListening(false)
      isAutoStartingRef.current = false
      if (noSpeechTimeout) {
        clearTimeout(noSpeechTimeout)
        setNoSpeechTimeout(null)
      }
    } else {
      try {
        console.log("Manually starting speech recognition")
        recognitionRef.current.start()
        setIsListening(true)
        setError(null)

        const timeout = setTimeout(() => {
          if (isListening && recognitionRef.current) {
            console.log("No speech timeout reached")
            recognitionRef.current.stop()
            setError("I didn't hear you. Please click the Speak button when you're ready to answer.")
            setIsListening(false)
          }
        }, 12000) // 12 seconds timeout
        setNoSpeechTimeout(timeout)
      } catch (error) {
        console.error("Error starting recognition:", error)
        setError("Could not start speech recognition. Please try again.")
      }
    }
  }

  // Stop speaking
  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel()
      setIsSpeaking(false)
      shouldAutoStartRef.current = false
    }
  }

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedInput = textInput.trim()
    if (trimmedInput) {
      setError(null) // Clear any previous errors
      handleUserMessage(trimmedInput)
    }
  }

  if (showAgentSelection) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="text-balance">Choose Your Virtual Assistant</CardTitle>
            <CardDescription>Select an agent to help you. Voice will match the agent&apos;s profile.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <RadioGroup
              value={selectedAgent.name}
              onValueChange={(name) => {
                const agent = AGENTS.find((a) => a.name === name)
                if (agent) setSelectedAgent(agent)
              }}
              className="grid grid-cols-2 gap-4"
            >
              {AGENTS.map((agent) => (
                <Label
                  key={agent.name}
                  htmlFor={agent.name}
                  className={cn(
                    "flex flex-col items-center gap-3 rounded-lg border-2 p-4 cursor-pointer transition-all hover:bg-accent",
                    selectedAgent.name === agent.name ? "border-primary bg-accent" : "border-muted",
                  )}
                >
                  <RadioGroupItem value={agent.name} id={agent.name} className="sr-only" />
                  <div
                    className={cn(
                      "rounded-full p-4",
                      agent.gender === "female" ? "bg-pink-100 text-pink-600" : "bg-blue-100 text-blue-600",
                    )}
                  >
                    <User className="h-8 w-8" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold">{agent.name}</p>
                    <p className="text-sm text-muted-foreground capitalize">{agent.gender} Voice</p>
                  </div>
                </Label>
              ))}
            </RadioGroup>

            <Button onClick={startChat} className="w-full" size="lg">
              Start Chat with {selectedAgent.name}
            </Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-balance">Voice Lead Collection</CardTitle>
              <CardDescription>Speaking with {selectedAgent.name}</CardDescription>
            </div>
            <div
              className={cn(
                "rounded-full p-3",
                selectedAgent.gender === "female" ? "bg-pink-100 text-pink-600" : "bg-blue-100 text-blue-600",
              )}
            >
              <User className="h-6 w-6" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive animate-in fade-in">{error}</div>
          )}

          <div className="space-y-3 rounded-lg bg-muted p-4 h-96 overflow-y-auto">
            {messages.map((message, idx) => (
              <div
                key={idx}
                className={cn(
                  "rounded-lg p-3 max-w-[80%] animate-in fade-in slide-in-from-bottom-2 duration-300",
                  message.role === "agent"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground ml-auto",
                )}
              >
                <p className="text-sm font-medium mb-1">{message.role === "agent" ? selectedAgent.name : "You"}</p>
                <p className="text-pretty">{message.content}</p>
                <p className="text-xs opacity-70 mt-1">{message.timestamp.toLocaleTimeString()}</p>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {manualInputMode && !isComplete && (
            <form onSubmit={handleTextSubmit} className="flex gap-2">
              <Input
                type="text"
                placeholder="Type your answer here..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                className="flex-1"
                autoFocus
              />
              <Button type="submit" disabled={!textInput.trim()}>
                <Keyboard className="mr-2 h-4 w-4" />
                Send
              </Button>
            </form>
          )}

          <div className="flex gap-2">
            <Button
              onClick={toggleListening}
              disabled={isComplete || isSpeaking || manualInputMode}
              variant={isListening ? "destructive" : "default"}
              className="flex-1"
            >
              {isListening ? (
                <>
                  <MicOff className="mr-2 h-4 w-4" />
                  Stop Listening
                </>
              ) : (
                <>
                  <Mic className="mr-2 h-4 w-4" />
                  {isComplete ? "Complete" : "Speak"}
                </>
              )}
            </Button>

            <Button
              onClick={() => {
                const newAudioState = !audioEnabled
                setAudioEnabled(newAudioState)
                shouldAutoStartRef.current = newAudioState && !manualInputMode && !isComplete
              }}
              variant="outline"
              size="icon"
              title={audioEnabled ? "Mute agent" : "Unmute agent"}
            >
              {audioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>

            {isSpeaking && (
              <Button onClick={stopSpeaking} variant="outline">
                Stop Speaking
              </Button>
            )}
          </div>

          {isComplete && (
            <div className="text-center space-y-2 animate-in fade-in slide-in-from-bottom">
              <p className="text-sm text-muted-foreground">Conversation complete! Thank you for your time.</p>
              <Button onClick={() => window.location.reload()} variant="outline" size="sm">
                Start New Session
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}