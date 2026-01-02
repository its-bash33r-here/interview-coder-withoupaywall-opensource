// MCQ.tsx
import React, { useState, useEffect, useRef } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { MCQResponse, MCQData } from "../types/mcq"
import { useToast } from "../contexts/toast"
import ScreenshotQueue from "../components/Queue/ScreenshotQueue"
import SolutionCommands from "../components/Solutions/SolutionCommands"
import { Screenshot } from "../types/screenshots"

export interface MCQProps {
  setView: (view: "queue" | "solutions" | "debug" | "mcq") => void
  credits: number
  currentLanguage: string
  setLanguage: (language: string) => void
}

const MCQ: React.FC<MCQProps> = ({
  setView,
  credits,
  currentLanguage,
  setLanguage
}) => {
  const queryClient = useQueryClient()
  const contentRef = useRef<HTMLDivElement>(null)
  const [mcqData, setMcqData] = useState<MCQResponse | null>(null)
  // Initialize as processing=true to prevent showing "No MCQ data available" on mount
  // If we're mounting in MCQ view, it means processing has started
  const [isProcessing, setIsProcessing] = useState(true)
  const [processingMessage, setProcessingMessage] = useState<string>("Analyzing MCQ and generating answers...")
  const [extraScreenshots, setExtraScreenshots] = useState<Screenshot[]>([])
  const [hasReceivedMCQStart, setHasReceivedMCQStart] = useState(true) // Assume true on mount
  const { showToast } = useToast()

  useEffect(() => {
    // Check if we have cached MCQ data - if so, we're not processing
    const cachedData = queryClient.getQueryData<MCQResponse>(["mcq"])
    if (cachedData) {
      setIsProcessing(false)
      setMcqData(cachedData)
      setHasReceivedMCQStart(true)
    }
    
    // Height update logic
    const updateDimensions = () => {
      if (contentRef.current) {
        const contentHeight = contentRef.current.scrollHeight
        const contentWidth = contentRef.current.scrollWidth
        window.electronAPI.updateContentDimensions({
          width: contentWidth,
          height: contentHeight
        })
      }
    }

    // Initialize resize observer
    const resizeObserver = new ResizeObserver(updateDimensions)
    if (contentRef.current) {
      resizeObserver.observe(contentRef.current)
    }
    updateDimensions()

    // Set up event listeners
    const cleanupFunctions = [
      window.electronAPI.onMCQStart(() => {
        setIsProcessing(true)
        setHasReceivedMCQStart(true)
        setMcqData(null)
        setProcessingMessage("Analyzing MCQ question from screenshots...")
        
        // Load screenshots when processing starts
        const fetchScreenshots = async () => {
          try {
            const existing = await window.electronAPI.getScreenshots()
            // Handle both array return (from handler) and object return (from type definition)
            const screenshots = (Array.isArray(existing) ? existing : (existing?.previews || [])).map((p) => ({
              id: p.path,
              path: p.path,
              preview: p.preview,
              timestamp: Date.now()
            }))
            setExtraScreenshots(screenshots)
          } catch (error) {
            console.error("Error loading screenshots:", error)
            setExtraScreenshots([])
          }
        }
        fetchScreenshots()
      }),
      window.electronAPI.onProcessingStatus((data: { message: string; progress: number }) => {
        setProcessingMessage(data.message)
      }),
      window.electronAPI.onMCQSuccess((data: MCQResponse) => {
        setIsProcessing(false)
        setProcessingMessage("")
        setMcqData(data)
        queryClient.setQueryData(["mcq"], data)
        
        // Fetch screenshots when MCQ is successful (like Solutions does)
        const fetchScreenshots = async () => {
          try {
            const existing = await window.electronAPI.getScreenshots()
            // Handle both array return (from handler) and object return (from type definition)
            const screenshots = (Array.isArray(existing) ? existing : (existing?.previews || [])).map((p) => ({
              id: p.path,
              path: p.path,
              preview: p.preview,
              timestamp: Date.now()
            }))
            setExtraScreenshots(screenshots)
          } catch (error) {
            console.error("Error loading screenshots:", error)
            setExtraScreenshots([])
          }
        }
        fetchScreenshots()
      }),
      window.electronAPI.onMCQError((error: string) => {
        setIsProcessing(false)
        setProcessingMessage("")
        showToast("MCQ Processing Failed", error, "error")
        setView("queue")
      }),
              window.electronAPI.onResetView(() => {
                queryClient.removeQueries({
                  queryKey: ["mcq"]
                })
                setMcqData(null)
                setExtraScreenshots([])
                setIsProcessing(false)
                setHasReceivedMCQStart(false)
                setView("queue")
              }),
      window.electronAPI.onProcessingNoScreenshots(() => {
        // Don't show "no screenshots" toast in MCQ mode during answer generation
        // Answer generation doesn't need screenshots - it uses extracted MCQ text
        // The screenshots are already displayed, so this message is not needed
        console.log('[MCQ.tsx] NO_SCREENSHOTS event received but ignoring in MCQ mode')
      })
    ]

    return () => {
      resizeObserver.disconnect()
      cleanupFunctions.forEach((cleanup) => cleanup())
    }
  }, [setView, queryClient, showToast])

  useEffect(() => {
    // Load MCQ data from query cache
    const cachedData = queryClient.getQueryData<MCQResponse>(["mcq"])
    if (cachedData) {
      setMcqData(cachedData)
    }
  }, [queryClient])

  const handleDeleteExtraScreenshot = async (index: number) => {
    const screenshotToDelete = extraScreenshots[index]
    if (screenshotToDelete) {
      try {
        await window.electronAPI.deleteScreenshot(screenshotToDelete.path)
        setExtraScreenshots((prev) => prev.filter((_, i) => i !== index))
      } catch (error) {
        console.error("Error deleting screenshot:", error)
        showToast("Error", "Failed to delete screenshot", "error")
      }
    }
  }

  return (
    <div ref={contentRef} className="relative">
      <div className="space-y-3 px-4 py-3">
        {/* Screenshot Queue for context (like Solutions) */}
        {/* Show screenshot queue if we have screenshots */}
        {extraScreenshots.length > 0 && (
          <div className="bg-transparent w-fit">
            <div className="pb-3">
              <div className="space-y-3 w-fit">
                <ScreenshotQueue
                  isLoading={isProcessing}
                  screenshots={extraScreenshots}
                  onDeleteScreenshot={handleDeleteExtraScreenshot}
                />
              </div>
            </div>
          </div>
        )}

        {/* Commands */}
        <SolutionCommands
          onTooltipVisibilityChange={() => {}}
          isProcessing={isProcessing}
          extraScreenshots={extraScreenshots}
          credits={credits}
          currentLanguage={currentLanguage}
          setLanguage={setLanguage}
        />

        {/* Main Content */}
        <div className="w-full text-sm text-black bg-black/60 rounded-md">
          <div className="rounded-lg overflow-hidden">
            <div className="px-4 py-3 space-y-4 max-w-full">
              {/* Show processing message when processing - always show it prominently */}
              {isProcessing && (
                <div className="mt-4 mb-4 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-6 h-6 border-2 border-white/20 border-t-white/80 rounded-full animate-spin"></div>
                    <p className="text-xs bg-gradient-to-r from-gray-300 via-gray-100 to-gray-300 bg-clip-text text-transparent animate-pulse">
                      {processingMessage || "Analyzing MCQ and generating answers..."}
                    </p>
                  </div>
                </div>
              )}

              {/* Show MCQ results when available and not processing */}
              {!isProcessing && mcqData && mcqData.questions && mcqData.questions.length > 0 && (
                <div className="space-y-6">
                  {mcqData.questions.map((question: MCQData, index: number) => (
                    <div key={index} className="space-y-3">
                      {/* Question Number */}
                      <div className="text-xs text-white/60">
                        Question {index + 1} of {mcqData.questions.length}
                      </div>

                      {/* Question */}
                      <div className="space-y-2">
                        <h2 className="text-[13px] font-medium text-white tracking-wide">
                          Question
                        </h2>
                        <div className="text-[13px] leading-[1.4] text-gray-100 bg-white/5 rounded-md p-3">
                          {question.question}
                        </div>
                      </div>

                      {/* Options */}
                      <div className="space-y-2">
                        <h2 className="text-[13px] font-medium text-white tracking-wide">
                          Options
                        </h2>
                        <div className="space-y-2">
                          {question.options.map((option, optIndex) => (
                            <div
                              key={optIndex}
                              className={`text-[13px] leading-[1.4] text-gray-100 rounded-md p-3 border ${
                                option.label === question.correctAnswer
                                  ? "bg-green-500/20 border-green-500/50"
                                  : "bg-white/5 border-white/10"
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <span className="font-medium text-white/90">
                                  {option.label}.
                                </span>
                                <span>{option.text}</span>
                                {option.label === question.correctAnswer && (
                                  <span className="ml-auto text-xs text-green-400 font-medium">
                                    ✓ Correct
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Correct Answer */}
                      <div className="space-y-2">
                        <h2 className="text-[13px] font-medium text-white tracking-wide">
                          Correct Answer
                        </h2>
                        <div className="text-[13px] leading-[1.4] text-gray-100 bg-green-500/20 border border-green-500/50 rounded-md p-3">
                          <div className="flex items-start gap-2">
                            <div className="w-1 h-1 rounded-full bg-green-400/80 mt-2 shrink-0" />
                            <div>
                              <strong className="text-green-400">
                                {question.correctAnswer}
                              </strong>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Explanation */}
                      <div className="space-y-2">
                        <h2 className="text-[13px] font-medium text-white tracking-wide">
                          Explanation
                        </h2>
                        <div className="text-[13px] leading-[1.4] text-gray-100 bg-white/5 rounded-md p-3">
                          {question.explanation}
                        </div>
                      </div>

                      {/* Separator between questions */}
                      {index < mcqData.questions.length - 1 && (
                        <div className="border-t border-white/10 pt-4" />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Never show "No MCQ data available" message - it's confusing and not needed */}
              {/* If user is in MCQ view, they either have data or are processing */}
              {/* The processing spinner above handles the "waiting" state */}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MCQ

