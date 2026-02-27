import { LazyConfirmModal } from "#components"

export interface PromptOptions {
  title: string,
  description?: string,

  okText?: string,
  okColor?: "primary" | "neutral" | "secondary" | "success" | "info" | "warning" | "error" | undefined,
  cancelText?: string
  cancelColor?: "primary" | "neutral" | "secondary" | "success" | "info" | "warning" | "error" | undefined
}

export function useModal() {
  const overlay = useOverlay()
  const modal = overlay.create(LazyConfirmModal)

  /**
   * Prompts user to select between two options, similar to js's prompt()
   * @param options title, description, button color/text
   * @returns boolean (true: left button / ok, false: right button / cancel)
   */
  async function promptConfirm(options?: PromptOptions) {
    const instance = modal.open(options)
    const result = await instance.result
    return result
  }

  return { promptConfirm }
}
