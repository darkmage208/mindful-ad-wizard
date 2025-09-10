import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LandingPage } from '@/types'
import {
  Monitor,
  Smartphone,
  Tablet,
  X,
  ExternalLink,
  Phone,
  Mail,
  MapPin,
  Star,
  Clock,
} from 'lucide-react'

interface PreviewDialogProps {
  landingPage: LandingPage
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function PreviewDialog({ landingPage, open, onOpenChange }: PreviewDialogProps) {
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')

  const deviceClasses = {
    desktop: 'w-full h-[600px]',
    tablet: 'w-[768px] h-[600px] mx-auto',
    mobile: 'w-[375px] h-[600px] mx-auto',
  }

  const handleLiveView = () => {
    window.open(landingPage.url, '_blank')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">{landingPage.name}</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Template: {landingPage.template}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {/* Device Preview Toggles */}
              <div className="flex border rounded-lg p-1">
                <Button
                  variant={previewDevice === 'desktop' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setPreviewDevice('desktop')}
                  className="px-3"
                >
                  <Monitor className="w-4 h-4" />
                </Button>
                <Button
                  variant={previewDevice === 'tablet' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setPreviewDevice('tablet')}
                  className="px-3"
                >
                  <Tablet className="w-4 h-4" />
                </Button>
                <Button
                  variant={previewDevice === 'mobile' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setPreviewDevice('mobile')}
                  className="px-3"
                >
                  <Smartphone className="w-4 h-4" />
                </Button>
              </div>
              
              <Button onClick={handleLiveView} variant="outline">
                <ExternalLink className="w-4 h-4 mr-2" />
                Live View
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 bg-gray-50">
          <div className={`${deviceClasses[previewDevice]} bg-white rounded-lg shadow-lg overflow-hidden border`}>
            <div className="h-full overflow-y-auto">
              <LandingPagePreview landingPage={landingPage} />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface LandingPagePreviewProps {
  landingPage: LandingPage
}

function LandingPagePreview({ landingPage }: LandingPagePreviewProps) {
  const { colors, content, contact, images } = landingPage
  
  return (
    <div className="min-h-full">
      {/* Hero Section */}
      <section
        className="relative py-8 sm:py-12 md:py-20 px-4 sm:px-6 text-center"
        style={{
          background: `linear-gradient(135deg, ${colors.primary}15, ${colors.accent}10)`,
        }}
      >
        {/* Hero Image */}
        {images && images.find(img => img.type === 'hero') && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-20"
            style={{
              backgroundImage: `url(${images.find(img => img.type === 'hero')?.url})`,
            }}
          />
        )}
        
        <div className="relative max-w-4xl mx-auto px-2 sm:px-0">
          <h1
            className="text-lg sm:text-2xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 md:mb-6"
            style={{ color: colors.primary }}
          >
            {content.headline}
          </h1>
          <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-600 mb-4 sm:mb-6 md:mb-8 max-w-xs sm:max-w-lg md:max-w-2xl mx-auto">
            {content.subheadline}
          </p>
          <Button
            size="lg"
            className="px-4 sm:px-6 md:px-8 py-2 md:py-3 text-sm sm:text-base md:text-lg w-full sm:w-auto max-w-xs sm:max-w-none mx-auto"
            style={{
              backgroundColor: colors.primary,
              borderColor: colors.primary,
            }}
          >
            {content.cta}
          </Button>
        </div>
      </section>

      {/* Description Section */}
      <section className="py-6 sm:py-10 md:py-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm sm:text-base md:text-lg text-gray-700 leading-relaxed px-2 sm:px-0">
            {content.description}
          </p>
        </div>
      </section>

      {/* Features Section */}
      {content.features && content.features.length > 0 && (
        <section className="py-6 sm:py-10 md:py-16 px-4 sm:px-6 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <h2
              className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-center mb-6 sm:mb-8 md:mb-12"
              style={{ color: colors.primary }}
            >
              Our Services
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 lg:gap-8">
              {content.features.map((feature, index) => (
                <div
                  key={index}
                  className="bg-white p-3 sm:p-4 md:p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow"
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
                    style={{ backgroundColor: `${colors.accent}20` }}
                  >
                    <div
                      className="w-6 h-6 rounded-full"
                      style={{ backgroundColor: colors.accent }}
                    />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature}</h3>
                  <p className="text-gray-600 text-sm">
                    Professional service tailored to your needs.
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Testimonials Section */}
      {content.testimonials && content.testimonials.length > 0 && (
        <section className="py-16 px-6">
          <div className="max-w-4xl mx-auto">
            <h2
              className="text-3xl font-bold text-center mb-12"
              style={{ color: colors.primary }}
            >
              What Our Clients Say
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {content.testimonials.map((testimonial, index) => (
                <div
                  key={index}
                  className="bg-white p-6 rounded-lg shadow-sm border"
                >
                  <div className="flex items-center mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star
                        key={i}
                        className="w-5 h-5 fill-current"
                        style={{ color: colors.accent }}
                      />
                    ))}
                  </div>
                  <blockquote className="text-gray-700 mb-4 italic">
                    "{testimonial.text}"
                  </blockquote>
                  <cite className="text-sm font-medium text-gray-900">
                    — {testimonial.author}
                  </cite>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Contact Section */}
      <section className="py-16 px-6 bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-8">Get In Touch</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {contact.phone && (
              <div className="flex flex-col items-center">
                <Phone className="w-8 h-8 mb-4" style={{ color: colors.accent }} />
                <h3 className="font-semibold mb-2">Call Us</h3>
                <p className="text-gray-300">{contact.phone}</p>
              </div>
            )}
            
            {contact.email && (
              <div className="flex flex-col items-center">
                <Mail className="w-8 h-8 mb-4" style={{ color: colors.accent }} />
                <h3 className="font-semibold mb-2">Email Us</h3>
                <p className="text-gray-300">{contact.email}</p>
              </div>
            )}
            
            {contact.address && (
              <div className="flex flex-col items-center">
                <MapPin className="w-8 h-8 mb-4" style={{ color: colors.accent }} />
                <h3 className="font-semibold mb-2">Visit Us</h3>
                <p className="text-gray-300">{contact.address}</p>
              </div>
            )}
          </div>

          {contact.hours && (
            <div className="flex items-center justify-center space-x-2 text-gray-300">
              <Clock className="w-4 h-4" />
              <span>{contact.hours}</span>
            </div>
          )}

          <div className="mt-8">
            <Button
              size="lg"
              className="px-8 py-3 text-lg"
              style={{
                backgroundColor: colors.primary,
                borderColor: colors.primary,
              }}
            >
              {content.cta}
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 bg-gray-100">
        <div className="max-w-4xl mx-auto text-center text-gray-600 text-sm">
          <p>© 2024 {landingPage.name}. All rights reserved.</p>
          {landingPage.seo?.keywords && (
            <p className="mt-2">
              Keywords: {landingPage.seo.keywords}
            </p>
          )}
        </div>
      </footer>
    </div>
  )
}