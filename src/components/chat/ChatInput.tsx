'use client'

import VoiceInput, { VoiceInputStatus } from './VoiceInput'
import FileUpload from './FileUpload'
import EmojiPicker from './EmojiPicker'
import MilestoneSelector from './MilestoneSelector'
import { useChatInput } from '@/hooks/useChatInput'

interface ChatInputProps {
  onSendMessage: (content: string, files: File[], milestoneType?: string) => Promise<void>
  placeholder?: string
  disabled?: boolean
}

export default function ChatInput({ onSendMessage, placeholder = "Type a message...", disabled = false }: ChatInputProps) {
  const {
    message,
    files,
    previewUrls,
    showEmojiPicker,
    showMilestones,
    selectedMilestone,
    isExpanded,
    sending,
    voiceError,
    isListening,
    canSend,
    textareaRef,
    setMessage,
    setShowEmojiPicker,
    setShowMilestones,
    setSelectedMilestone,
    setIsExpanded,
    addFiles,
    removeFile,
    insertEmoji,
    handleVoiceTranscript,
    handleVoiceError,
    handleSubmit,
    handleKeyPress
  } = useChatInput({ onSendMessage, disabled })

  return (
    <div className="border-t border-gray-200 bg-white">
      {/* Expanded content (files, milestones) */}
      {isExpanded && (
        <div className="p-4 border-b border-gray-100">
          <FileUpload 
            files={files}
            previewUrls={previewUrls}
            onFilesAdded={addFiles}
            onFileRemove={removeFile}
            disabled={disabled || sending}
          />
          
          <MilestoneSelector
            isVisible={showMilestones}
            selectedMilestone={selectedMilestone}
            onMilestoneChange={setSelectedMilestone}
            onToggle={() => {
              setShowMilestones(!showMilestones)
              setIsExpanded(true)
            }}
            disabled={disabled || sending}
          />
        </div>
      )}

      {/* Main input area */}
      <form onSubmit={handleSubmit} className="p-4">
        <div className="flex items-end space-x-3">
          {/* Textarea */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              onFocus={() => setIsExpanded(true)}
              placeholder={placeholder}
              disabled={disabled || sending}
              className="w-full px-3 py-2 pr-20 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              rows={1}
              maxLength={2000}
              style={{ maxHeight: '120px', overflowY: 'auto' }}
            />

            {/* Input actions (emoji, attach, voice) */}
            <div className="absolute bottom-2 right-2 flex items-center space-x-1">
              {/* Voice Input */}
              <VoiceInput
                onTranscript={handleVoiceTranscript}
                onError={handleVoiceError}
                isDisabled={disabled || sending}
              />
              
              {/* Emoji Picker */}
              <EmojiPicker
                isOpen={showEmojiPicker}
                onEmojiSelect={insertEmoji}
                onClose={() => setShowEmojiPicker(!showEmojiPicker)}
                disabled={disabled || sending}
              />

              {/* File Attachment */}
              <FileUpload 
                files={files}
                previewUrls={previewUrls}
                onFilesAdded={addFiles}
                onFileRemove={removeFile}
                disabled={disabled || sending}
                buttonOnly={true}
              />

              {/* Milestone Toggle */}
              <MilestoneSelector
                isVisible={showMilestones}
                selectedMilestone={selectedMilestone}
                onMilestoneChange={setSelectedMilestone}
                onToggle={() => {
                  setShowMilestones(!showMilestones)
                  setIsExpanded(true)
                }}
                disabled={disabled || sending}
                buttonOnly={true}
              />
            </div>
          </div>

          {/* Send Button */}
          <button
            type="submit"
            disabled={!canSend || disabled}
            className={`p-2 rounded-full transition-colors ${
              canSend && !disabled
                ? 'bg-blue-500 text-white hover:bg-blue-600' 
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {sending ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>

        {/* Voice Input Status */}
        {(isListening || voiceError) && (
          <div className="mt-2">
            <VoiceInputStatus isListening={isListening} error={voiceError} />
          </div>
        )}

        {/* Character counter */}
        {message.length > 1800 && (
          <div className="mt-2 text-xs text-gray-500 text-right">
            {message.length}/2000
          </div>
        )}
      </form>
    </div>
  )
}