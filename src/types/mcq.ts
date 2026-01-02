export interface MCQOption {
  label: string // "A", "B", "C", "D" or "1", "2", "3", "4"
  text: string
}

export interface MCQData {
  question: string
  options: MCQOption[]
  correctAnswer: string // "B" or "Option 2"
  explanation: string
}

export interface MCQResponse {
  questions: MCQData[] // Support multiple questions per screenshot
}

