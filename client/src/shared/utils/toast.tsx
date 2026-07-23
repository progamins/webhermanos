import { toast } from 'sonner';

type ToastType = 'success' | 'error' | 'info' | 'warning';

export function showToast(message: string, type: ToastType = 'success', title?: string) {
  const mainText = title || message;
  const description = title ? message : undefined;

  switch (type) {
    case 'success':
      toast.success(mainText, description ? { description } : undefined);
      break;
    case 'error':
      toast.error(mainText, description ? { description } : undefined);
      break;
    case 'warning':
      toast.warning(mainText, description ? { description } : undefined);
      break;
    case 'info':
      toast.info(mainText, description ? { description } : undefined);
      break;
  }
}
