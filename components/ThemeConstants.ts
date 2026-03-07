export interface ThemeColor {
    name: string;
    value: string;
    primary: string;
    secondary: string;
}

export const THEME_COLORS: ThemeColor[] = [
    { name: 'Grey', value: 'slate', primary: '#5f6368', secondary: '#dadce0' },
    { name: 'Midnight Blue', value: 'indigo', primary: '#344955', secondary: '#f0f4f8' },
    { name: 'Blue', value: 'blue', primary: '#1a73e8', secondary: '#d2e3fc' },
    { name: 'Teal', value: 'teal', primary: '#007b83', secondary: '#cce8e9' },
    { name: 'Green', value: 'emerald', primary: '#1e8e3e', secondary: '#ceead6' },
    { name: 'Yellow', value: 'yellow', primary: '#f9ab00', secondary: '#feefc3' },
    { name: 'Orange', value: 'orange', primary: '#e37400', secondary: '#feefe3' },
    { name: 'Pink', value: 'pink', primary: '#d01884', secondary: '#fdcfe8' },
    { name: 'Purple', value: 'purple', primary: '#9334e6', secondary: '#f3e8fd' },
    { name: 'Red', value: 'red', primary: '#d93025', secondary: '#fce8e6' },
    { name: 'Cyan', value: 'cyan', primary: '#006d5b', secondary: '#e0f2f1' },
    { name: 'Violet', value: 'violet', primary: '#8430ce', secondary: '#f3e5f5' },
    { name: 'Rose', value: 'rose', primary: '#b80672', secondary: '#fce4ec' },
    { name: 'Brown', value: 'amber', primary: '#795548', secondary: '#efebe9' },
];
