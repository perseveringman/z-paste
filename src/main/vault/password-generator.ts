export interface PasswordGenerateOptions {
  length?: number
  useUppercase?: boolean
  useLowercase?: boolean
  useNumbers?: boolean
  useSymbols?: boolean
  readable?: boolean
}

const UPPERCASE = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const LOWERCASE = 'abcdefghjkmnpqrstuvwxyz'
const NUMBERS = '23456789'
const SYMBOLS = '!@#$%^&*()-_=+[]{};:,.?'

function randomInt(max: number): number {
  return Math.floor(Math.random() * max)
}

function pick(chars: string): string {
  return chars[randomInt(chars.length)]
}

export function generatePassword(options: PasswordGenerateOptions = {}): string {
  const {
    length = 20,
    useUppercase = true,
    useLowercase = true,
    useNumbers = true,
    useSymbols = true
  } = options

  const groups: string[] = []
  if (useUppercase) groups.push(UPPERCASE)
  if (useLowercase) groups.push(LOWERCASE)
  if (useNumbers) groups.push(NUMBERS)
  if (useSymbols) groups.push(SYMBOLS)

  if (groups.length === 0) {
    throw new Error('At least one character group must be enabled')
  }

  const finalLength = Math.max(length, groups.length)
  const allChars = groups.join('')
  const chars: string[] = []

  // Force at least one character from each enabled group.
  for (const group of groups) {
    chars.push(pick(group))
  }

  while (chars.length < finalLength) {
    chars.push(pick(allChars))
  }

  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }

  return chars.join('')
}

