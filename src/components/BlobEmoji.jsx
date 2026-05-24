export const BLOB_EMOJIS = [
  { id: 'happy',   label: '행복',   color: '#F8D872' },
  { id: 'shy',     label: '수줍음', color: '#F2AFA8' },
  { id: 'warm',    label: '설렘',   color: '#F0A853' },
  { id: 'sleepy',  label: '졸림',   color: '#BAC4C1' },
  { id: 'calm',    label: '평온',   color: '#89AAC9' },
  { id: 'sad',     label: '슬픔',   color: '#89AAC9' },
  { id: 'worried', label: '걱정',   color: '#C0A9C5' },
  { id: 'cool',    label: '무감',   color: '#4C6699' },
  { id: 'okay',    label: '괜찮아', color: '#6AC983' },
  { id: 'excited', label: '신남',   color: '#EA5E66' },
]

export function BlobFace({ id, size = 52 }) {
  const info = BLOB_EMOJIS.find(e => e.id === id)
  if (!info) return null
  return (
    <img
      src={`${import.meta.env.BASE_URL}emoji/${id}.png`}
      width={size}
      height={size}
      alt={info.label}
      draggable={false}
      style={{ display: 'block', borderRadius: '50%' }}
    />
  )
}
