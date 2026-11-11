import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useInstallPrompt } from './useInstallPrompt'

export function InstallPage() {
  const { canPrompt, triggerInstall, isIos } = useInstallPrompt()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 p-6 max-w-md mx-auto">
      <div className="text-4xl mb-4">📲</div>
      <h1 className="text-xl font-semibold text-center mb-2">Installeer de app</h1>
      <p className="text-sm text-muted-foreground text-center mb-6">
        Zet de app op je beginscherm zodat ze schermvullend en offline werkt.
        Dit is verplicht om enquêtes te kunnen starten.
      </p>

      {isIos ? (
        <Card className="w-full">
          <CardContent className="p-4 space-y-4">
            <p className="text-sm font-medium">Stap 1</p>
            <div className="flex items-start gap-3">
              <span className="text-2xl">⬆️</span>
              <p className="text-sm">
                Tik onderaan op het <strong>Deel-icoon</strong>{' '}
                <span className="inline-block border rounded px-1 text-xs">⬆</span>
              </p>
            </div>
            <p className="text-sm font-medium">Stap 2</p>
            <div className="flex items-start gap-3">
              <span className="text-2xl">➕</span>
              <p className="text-sm">
                Scroll naar beneden en tik op <strong>"Zet op beginscherm"</strong>
              </p>
            </div>
            <p className="text-sm font-medium">Stap 3</p>
            <div className="flex items-start gap-3">
              <span className="text-2xl">✅</span>
              <p className="text-sm">
                Tik op <strong>"Voeg toe"</strong> en open de app via het beginscherm.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : canPrompt ? (
        <Button size="lg" className="w-full" onClick={triggerInstall}>
          App installeren
        </Button>
      ) : (
        <Card className="w-full">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⋮</span>
              <p className="text-sm">
                Tik op het <strong>menu ⋮</strong> van Chrome
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">➕</span>
              <p className="text-sm">
                Tik op <strong>"App toevoegen aan startscherm"</strong>
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <p className="mt-6 text-xs text-muted-foreground text-center">
        Na de installatie opent de app vanuit het beginscherm.
      </p>
    </div>
  )
}
