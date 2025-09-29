import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LandingPage } from '@/types'
import { generateLandingPageUrl } from '@/lib/utils'
import {
  Monitor,
  Smartphone,
  Tablet,
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
    desktop: 'w-full h-[calc(90vh-120px)]',
    tablet: 'w-full max-w-[768px] h-[calc(90vh-120px)] mx-auto',
    mobile: 'w-full max-w-[375px] h-[calc(90vh-120px)] mx-auto',
  }

  const handleLiveView = () => {
    const url = generateLandingPageUrl(landingPage.slug)
    window.open(url, '_blank')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-7xl h-[90vh] max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-3 sm:p-6 pb-3 sm:pb-4 border-b shrink-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-lg sm:text-xl truncate">{landingPage.name}</DialogTitle>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Template: {landingPage.template}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2 w-full sm:w-auto">
              {/* Device Preview Toggles */}
              <div className="flex border rounded-lg p-1">
                <Button
                  variant={previewDevice === 'desktop' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setPreviewDevice('desktop')}
                  className="px-2 sm:px-3 flex-1 sm:flex-initial"
                >
                  <Monitor className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="ml-1 text-xs sm:hidden">Desktop</span>
                </Button>
                <Button
                  variant={previewDevice === 'tablet' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setPreviewDevice('tablet')}
                  className="px-2 sm:px-3 flex-1 sm:flex-initial"
                >
                  <Tablet className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="ml-1 text-xs sm:hidden">Tablet</span>
                </Button>
                <Button
                  variant={previewDevice === 'mobile' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setPreviewDevice('mobile')}
                  className="px-2 sm:px-3 flex-1 sm:flex-initial"
                >
                  <Smartphone className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="ml-1 text-xs sm:hidden">Mobile</span>
                </Button>
              </div>

              <Button onClick={handleLiveView} variant="outline" size="sm" className="w-full sm:w-auto">
                <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                <span className="text-xs sm:text-sm">Live View</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 p-2 sm:p-4 lg:p-6 bg-gray-50 overflow-hidden min-h-0">
          <div className={`${deviceClasses[previewDevice]} bg-white rounded-lg shadow-lg overflow-hidden border`}>
            <div className="h-full overflow-y-auto">
              <LandingPagePreview landingPage={landingPage} previewDevice={previewDevice} />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface LandingPagePreviewProps {
  landingPage: LandingPage
  previewDevice?: 'desktop' | 'tablet' | 'mobile'
}

function LandingPagePreview({ landingPage, previewDevice = 'desktop' }: LandingPagePreviewProps) {
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
        {images && images.find((img: any) => img.type === 'hero') && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-20"
            style={{
              backgroundImage: `url(${images.find((img: any) => img.type === 'hero')?.url})`,
            }}
          />
        )}
        
        <div className="relative max-w-4xl mx-auto px-4">
          <h1
            className={`font-bold mb-3 sm:mb-4 md:mb-6 ${
              previewDevice === 'mobile'
                ? 'text-xl'
                : previewDevice === 'tablet'
                ? 'text-2xl md:text-3xl'
                : 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl'
            }`}
            style={{ color: colors.primary }}
          >
            {content.headline}
          </h1>
          <p className={`text-gray-600 mb-4 sm:mb-6 md:mb-8 mx-auto ${
            previewDevice === 'mobile'
              ? 'text-sm max-w-sm'
              : previewDevice === 'tablet'
              ? 'text-base max-w-lg'
              : 'text-base sm:text-lg md:text-xl max-w-sm sm:max-w-lg md:max-w-2xl'
          }`}>
            {content.subheadline}
          </p>
          <Button
            size={previewDevice === 'mobile' ? 'default' : 'lg'}
            className={`${
              previewDevice === 'mobile'
                ? 'w-full px-4 py-2 text-sm'
                : previewDevice === 'tablet'
                ? 'px-6 py-2 text-base w-auto'
                : 'px-4 sm:px-6 md:px-8 py-2 md:py-3 text-sm sm:text-base md:text-lg w-full sm:w-auto'
            }`}
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
      <section className={`px-4 sm:px-6 ${
        previewDevice === 'mobile' ? 'py-4' : previewDevice === 'tablet' ? 'py-6' : 'py-6 sm:py-10 md:py-16'
      }`}>
        <div className="max-w-4xl mx-auto text-center">
          <p className={`text-gray-700 leading-relaxed ${
            previewDevice === 'mobile' ? 'text-sm' : previewDevice === 'tablet' ? 'text-base' : 'text-sm sm:text-base md:text-lg'
          }`}>
            {content.description}
          </p>
        </div>
      </section>

      {/* Features Section */}
      {content.features && content.features.length > 0 && (
        <section className={`px-4 sm:px-6 bg-gray-50 ${
          previewDevice === 'mobile' ? 'py-4' : previewDevice === 'tablet' ? 'py-6' : 'py-6 sm:py-10 md:py-16'
        }`}>
          <div className="max-w-6xl mx-auto">
            <h2
              className={`font-bold text-center mb-4 sm:mb-6 md:mb-8 ${
                previewDevice === 'mobile' ? 'text-lg' : previewDevice === 'tablet' ? 'text-xl' : 'text-lg sm:text-xl md:text-2xl lg:text-3xl'
              }`}
              style={{ color: colors.primary }}
            >
              Our Services
            </h2>
            <div className={`grid gap-3 sm:gap-4 md:gap-6 justify-items-center ${
              previewDevice === 'mobile'
                ? 'grid-cols-1'
                : previewDevice === 'tablet'
                ? 'grid-cols-2'
                : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
            }`}>
              {content.features.map((feature, index) => (
                <div
                  key={index}
                  className={`bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow w-full max-w-sm flex flex-col items-center text-center ${
                    previewDevice === 'mobile' ? 'p-3' : 'p-3 sm:p-4 md:p-6'
                  }`}
                >
                  <div
                    className={`rounded-full flex items-center justify-center mb-3 mx-auto ${
                      previewDevice === 'mobile' ? 'w-10 h-10' : 'w-12 h-12'
                    }`}
                    style={{ backgroundColor: `${colors.accent}20` }}
                  >
                    <div
                      className={`rounded-full ${
                        previewDevice === 'mobile' ? 'w-5 h-5' : 'w-6 h-6'
                      }`}
                      style={{ backgroundColor: colors.accent }}
                    />
                  </div>
                  <h3 className={`font-semibold mb-2 ${
                    previewDevice === 'mobile' ? 'text-base' : 'text-lg'
                  }`}>{feature}</h3>
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
        <section className={`px-4 sm:px-6 ${
          previewDevice === 'mobile' ? 'py-4' : previewDevice === 'tablet' ? 'py-8' : 'py-8 sm:py-12 md:py-16'
        }`}>
          <div className="max-w-4xl mx-auto">
            <h2
              className={`font-bold text-center mb-6 sm:mb-8 md:mb-12 ${
                previewDevice === 'mobile' ? 'text-lg' : previewDevice === 'tablet' ? 'text-2xl' : 'text-2xl sm:text-3xl'
              }`}
              style={{ color: colors.primary }}
            >
              What Our Clients Say
            </h2>
            <div className={`grid gap-4 sm:gap-6 md:gap-8 justify-items-center ${
              previewDevice === 'mobile' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'
            }`}>
              {content.testimonials.map((testimonial, index) => (
                <div
                  key={index}
                  className={`bg-white rounded-lg shadow-sm border w-full max-w-md flex flex-col items-center text-center ${
                    previewDevice === 'mobile' ? 'p-4' : 'p-4 sm:p-6'
                  }`}
                >
                  <div className="flex items-center justify-center mb-3 sm:mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star
                        key={i}
                        className={`fill-current ${
                          previewDevice === 'mobile' ? 'w-4 h-4' : 'w-5 h-5'
                        }`}
                        style={{ color: colors.accent }}
                      />
                    ))}
                  </div>
                  <blockquote className={`text-gray-700 mb-3 sm:mb-4 italic ${
                    previewDevice === 'mobile' ? 'text-sm' : 'text-base'
                  }`}>
                    "{testimonial.text}"
                  </blockquote>
                  <cite className="text-sm font-medium text-gray-900 text-center">
                    — {testimonial.author}
                  </cite>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Contact Section */}
      <section className={`px-4 sm:px-6 bg-gray-900 text-white ${
        previewDevice === 'mobile' ? 'py-6' : previewDevice === 'tablet' ? 'py-10' : 'py-10 sm:py-16'
      }`}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className={`font-bold mb-6 sm:mb-8 ${
            previewDevice === 'mobile' ? 'text-xl' : previewDevice === 'tablet' ? 'text-2xl' : 'text-2xl sm:text-3xl'
          }`}>Get In Touch</h2>
          <div className={`grid gap-4 sm:gap-6 md:gap-8 mb-8 sm:mb-12 ${
            previewDevice === 'mobile'
              ? 'grid-cols-1'
              : previewDevice === 'tablet'
              ? 'grid-cols-2'
              : 'grid-cols-1 md:grid-cols-3'
          }`}>
            {contact.phone && (
              <div className="flex flex-col items-center">
                <Phone className={`mb-3 sm:mb-4 ${
                  previewDevice === 'mobile' ? 'w-6 h-6' : 'w-8 h-8'
                }`} style={{ color: colors.accent }} />
                <h3 className={`font-semibold mb-2 ${
                  previewDevice === 'mobile' ? 'text-sm' : 'text-base'
                }`}>Call Us</h3>
                <p className={`text-gray-300 ${
                  previewDevice === 'mobile' ? 'text-sm' : 'text-base'
                }`}>{contact.phone}</p>
              </div>
            )}

            {contact.email && (
              <div className="flex flex-col items-center">
                <Mail className={`mb-3 sm:mb-4 ${
                  previewDevice === 'mobile' ? 'w-6 h-6' : 'w-8 h-8'
                }`} style={{ color: colors.accent }} />
                <h3 className={`font-semibold mb-2 ${
                  previewDevice === 'mobile' ? 'text-sm' : 'text-base'
                }`}>Email Us</h3>
                <p className={`text-gray-300 ${
                  previewDevice === 'mobile' ? 'text-sm break-all' : 'text-base'
                }`}>{contact.email}</p>
              </div>
            )}

            {contact.address && (
              <div className="flex flex-col items-center">
                <MapPin className={`mb-3 sm:mb-4 ${
                  previewDevice === 'mobile' ? 'w-6 h-6' : 'w-8 h-8'
                }`} style={{ color: colors.accent }} />
                <h3 className={`font-semibold mb-2 ${
                  previewDevice === 'mobile' ? 'text-sm' : 'text-base'
                }`}>Visit Us</h3>
                <p className={`text-gray-300 ${
                  previewDevice === 'mobile' ? 'text-sm text-center' : 'text-base'
                }`}>{contact.address}</p>
              </div>
            )}
          </div>

          {contact.hours && (
            <div className={`flex items-center justify-center space-x-2 text-gray-300 ${
              previewDevice === 'mobile' ? 'text-sm' : 'text-base'
            }`}>
              <Clock className="w-4 h-4" />
              <span>{contact.hours}</span>
            </div>
          )}

          <div className={previewDevice === 'mobile' ? 'mt-6' : 'mt-8'}>
            <Button
              size={previewDevice === 'mobile' ? 'default' : 'lg'}
              className={`${
                previewDevice === 'mobile'
                  ? 'px-6 py-2 text-base w-full max-w-xs'
                  : previewDevice === 'tablet'
                  ? 'px-8 py-3 text-lg'
                  : 'px-8 py-3 text-lg'
              }`}
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
      <footer className={`px-4 sm:px-6 bg-gray-100 ${
        previewDevice === 'mobile' ? 'py-4' : 'py-6 sm:py-8'
      }`}>
        <div className="max-w-4xl mx-auto text-center text-gray-600 text-xs sm:text-sm">
          <p>© 2025 {landingPage.name}. All rights reserved.</p>
          {landingPage.seo?.keywords && (
            <p className="mt-1 sm:mt-2">
              Keywords: {landingPage.seo.keywords}
            </p>
          )}
        </div>
      </footer>
    </div>
  )
}