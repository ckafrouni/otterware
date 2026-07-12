import { Check, Laptop, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'

const themes = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Laptop },
] as const

export function ThemeMenu() {
  const { theme, setTheme } = useTheme()

  return (
    <DropdownMenuGroup>
      <DropdownMenuLabel>Theme</DropdownMenuLabel>
      {themes.map(({ value, label, icon: Icon }) => (
        <DropdownMenuItem key={value} onClick={() => setTheme(value)}>
          <Icon />
          <span>{label}</span>
          {theme === value && <Check className="menu-item-check" />}
        </DropdownMenuItem>
      ))}
    </DropdownMenuGroup>
  )
}
