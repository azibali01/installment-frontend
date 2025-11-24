

declare module '@radix-ui/react-accordion' {
    const Root: any;
    const Item: any;
    const Header: any;
    const Trigger: any;
    const Content: any;
    export { Root, Item, Header, Trigger, Content };
}

declare module '@radix-ui/react-alert-dialog' {
    const Root: any;
    const Trigger: any;
    const Portal: any;
    const Overlay: any;
    const Content: any;
    const Title: any;
    const Description: any;
    const Action: any;
    const Cancel: any;
    export { Root, Trigger, Portal, Overlay, Content, Title, Description, Action, Cancel };
}

// For convenience, export each Radix package as a single `any` value so
// `import * as X from '@radix-ui/...'` yields a usable `any` namespace.
declare module '@radix-ui/*' {
    const _radixAny: any;
    export = _radixAny;
}

declare module '@radix-ui/react-aspect-ratio' { const _radixAny: any; export = _radixAny }
declare module '@radix-ui/react-tooltip' { const _radixAny: any; export = _radixAny }
declare module '@radix-ui/react-toggle' { const _radixAny: any; export = _radixAny }
declare module '@radix-ui/react-toggle-group' { const _radixAny: any; export = _radixAny }
declare module '@radix-ui/react-toast' { const _radixAny: any; export = _radixAny }
declare module '@radix-ui/react-tabs' { const _radixAny: any; export = _radixAny }
declare module '@radix-ui/react-switch' { const _radixAny: any; export = _radixAny }
declare module '@radix-ui/react-slider' { const _radixAny: any; export = _radixAny }
declare module '@radix-ui/react-slot' {
    export const Slot: any;
    const _default: any;
    export default _default;
}
declare module '@radix-ui/react-dialog' { const _radixAny: any; export = _radixAny }
declare module '@radix-ui/react-separator' { const _radixAny: any; export = _radixAny }
declare module '@radix-ui/react-select' { const _radixAny: any; export = _radixAny }
declare module '@radix-ui/react-scroll-area' { const _radixAny: any; export = _radixAny }
declare module '@radix-ui/react-radio-group' { const _radixAny: any; export = _radixAny }
declare module '@radix-ui/react-progress' { const _radixAny: any; export = _radixAny }
declare module '@radix-ui/react-popover' { const _radixAny: any; export = _radixAny }
declare module '@radix-ui/react-navigation-menu' { const _radixAny: any; export = _radixAny }
declare module '@radix-ui/react-menubar' {
    export const Root: any;
    export const Menu: any;
    export const Trigger: any;
    export const Content: any;
    export const Item: any;
    export const Separator: any;
    const _default: any;
    export default _default;
}
declare module '@radix-ui/react-label' { const _radixAny: any; export = _radixAny }
declare module '@radix-ui/react-hover-card' { const _radixAny: any; export = _radixAny }
declare module '@radix-ui/react-avatar' { const _radixAny: any; export = _radixAny }
declare module '@radix-ui/react-checkbox' { const _radixAny: any; export = _radixAny }

// Recharts has its own types that may conflict with project React types; export as any.
declare module 'recharts' { const _rechartsAny: any; export = _rechartsAny }


declare module 'lucide-react' {
    export const ChevronDownIcon: any;
    export const X: any;
    export const Loader2Icon: any;
    export const PanelLeftIcon: any;
    export const XIcon: any;
    export const CheckIcon: any;
    export const ChevronUpIcon: any;
    export const GripVerticalIcon: any;
    export const CircleIcon: any;
    export const ArrowLeft: any;
    export const ArrowRight: any;
    export const ChevronLeftIcon: any;
    export const ChevronLeft: any;
    export const SearchIcon: any;
    export const MinusIcon: any;
    export const ChevronRightIcon: any;
    export const ChevronRight: any;
    export const MoreHorizontal: any;
    const _default: any;
    export default _default;
}
