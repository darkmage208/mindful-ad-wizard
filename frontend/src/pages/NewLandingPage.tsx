import { useParams } from 'react-router-dom'
import LandingPageEditor from '@/components/landing-page/LandingPageEditor'

export default function NewLandingPage() {
  const { id } = useParams()

  return <LandingPageEditor landingPageId={id} />
}