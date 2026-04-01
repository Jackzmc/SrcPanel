import { LazyModalsConfirmModal, LazyModalsInputModal } from "#components"

export interface PromptConfirmOptions {
  title: string,
  description?: string,

  body?: string,

  okText?: string,
  okColor?: "primary" | "neutral" | "secondary" | "success" | "info" | "warning" | "error" | undefined,
  /** default true. set to false to hide ok button button */
  okShown?: boolean,

  cancelText?: string
  cancelColor?: "primary" | "neutral" | "secondary" | "success" | "info" | "warning" | "error" | undefined,


}

export interface PromptInputOptions {
  title: string,
  description?: string,
  defaultValue?: string,
  minlength?: number,
  maxlength?: number,
  placeholder?: string,
  type?: "number" | "text"
}

export function useModal() {
  const overlay = useOverlay()
  const confirmModal = overlay.create(LazyModalsConfirmModal)
  const inputModal = overlay.create(LazyModalsInputModal)

  // Modals return a value with emit('close', value

  /**
   * Prompts user to select between two options, similar to js's prompt()
   * @param options title, description, button color/text
   * @returns boolean (true: left button / ok, false: right button / cancel)
   */
  async function promptConfirm(options?: PromptConfirmOptions) {
    const instance = confirmModal.open(options)
    const result = await instance.result
    return result
  }

  /**
   * Prompts user to input a value, similar to js's prompt()
   * @param title
   * @param options
   * @returns user's response value
   */
  async function promptInput(options: PromptInputOptions): Promise<string | undefined> {
    const instance = inputModal.open(options)
    const result = await instance.result
    return result
  }

  return { promptConfirm, promptInput }
}
