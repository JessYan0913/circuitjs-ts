import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

export interface ModalProps {
    title: string;
    onClose: () => void;
    children: React.ReactNode;
    width?: number;
}

export function Modal({ title, onClose, children, width }: ModalProps) {
    return (
        <Dialog.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50 data-[state=open]:animate-in data-[state=closed]:animate-out" />
                <Dialog.Content
                    style={{ maxWidth: width ? `${width}px` : '600px' }}
                    className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                               bg-[#1e1e1e] border border-[#444] rounded-md
                               shadow-[0_8px_32px_rgba(0,0,0,0.5)]
                               w-full max-h-[80vh] flex flex-col
                               z-50 data-[state=open]:animate-in data-[state=closed]:animate-out"
                    onEscapeKeyDown={onClose}
                    onPointerDownOutside={onClose}
                >
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#333] select-none">
                        <Dialog.Title className="m-0 text-white text-circuit-xl font-semibold font-mono">
                            {title}
                        </Dialog.Title>
                        <Dialog.Close
                            className="text-circuit-text-muted hover:text-white
                                       bg-transparent border-none cursor-pointer
                                       rounded p-0.5 inline-flex items-center justify-center"
                        >
                            <X className="h-4 w-4" />
                        </Dialog.Close>
                    </div>
                    <div className="p-4 overflow-auto flex-1">
                        {children}
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
