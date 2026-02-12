'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import {
  Settings,
  User,
  Shield,
  Bell,
  Mail,
  MessageCircle,
  Save,
  CheckCircle,
  Building2,
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { cn } from '@/lib/utils'

type Tab = 'perfil' | 'empresa' | 'notificacoes'

export default function ConfigPage() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState<Tab>('perfil')
  const [saved, setSaved] = useState(false)

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'perfil', label: 'Meu Perfil', icon: <User className="h-4 w-4" /> },
    { id: 'empresa', label: 'Empresa', icon: <Building2 className="h-4 w-4" /> },
    { id: 'notificacoes', label: 'Notificacoes', icon: <Bell className="h-4 w-4" /> },
  ]

  const showSaved = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Settings className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-dark-800">Configuracoes</h1>
          <p className="text-sm text-dark-400">Gerencie seu perfil e preferencias do sistema</p>
        </div>
      </div>

      {/* Toast */}
      {saved && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 shadow-lg text-sm">
          <CheckCircle className="h-4 w-4" />
          Configuracoes salvas com sucesso!
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-dark-50 rounded-xl p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            aria-label={tab.label}
            className={cn(
              'flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex-1 justify-center',
              activeTab === tab.id
                ? 'bg-white text-dark-800 shadow-sm'
                : 'text-dark-400 hover:text-dark-600 active:text-dark-700'
            )}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden text-xs">{tab.id === 'perfil' ? 'Perfil' : tab.id === 'empresa' ? 'Empresa' : 'Notif.'}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white border border-dark-100 rounded-2xl p-4 sm:p-6">
        {activeTab === 'perfil' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-dark-800 mb-1">Meu Perfil</h2>
              <p className="text-sm text-dark-400">Informacoes da sua conta</p>
            </div>

            <div className="flex items-center gap-4 p-4 bg-dark-50 rounded-xl">
              <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center text-dark-900 font-bold text-xl">
                {session?.user?.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U'}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-dark-800">{session?.user?.name || 'Usuario'}</h3>
                <p className="text-sm text-dark-400">{session?.user?.email}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Shield className="h-3 w-3 text-primary" />
                  <span className="text-xs text-primary font-medium capitalize">
                    {(session?.user as any)?.role || 'usuario'}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Nome"
                defaultValue={session?.user?.name || ''}
                placeholder="Seu nome"
              />
              <Input
                label="Email"
                type="email"
                defaultValue={session?.user?.email || ''}
                placeholder="seu@email.com"
                disabled
                hint="O email nao pode ser alterado"
              />
              <Input
                label="Nova Senha"
                type="password"
                placeholder="Deixe em branco para manter"
              />
              <Input
                label="Confirmar Nova Senha"
                type="password"
                placeholder="Confirme a nova senha"
              />
            </div>

            <Button variant="primary" icon={<Save className="h-4 w-4" />} onClick={showSaved}>
              Salvar Perfil
            </Button>
          </div>
        )}

        {activeTab === 'empresa' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-dark-800 mb-1">Dados da Empresa</h2>
              <p className="text-sm text-dark-400">Informacoes exibidas nos relatorios e PDFs</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Nome da Empresa"
                defaultValue="Omegarad"
                placeholder="Nome da empresa"
              />
              <Input
                label="CNPJ"
                defaultValue=""
                placeholder="00.000.000/0000-00"
              />
              <Input
                label="Telefone"
                defaultValue=""
                placeholder="(00) 00000-0000"
              />
              <Input
                label="Email"
                defaultValue=""
                placeholder="contato@empresa.com"
              />
              <div className="sm:col-span-2">
                <Input
                  label="Endereco"
                  defaultValue=""
                  placeholder="Endereco completo"
                />
              </div>
            </div>

            <Button variant="primary" icon={<Save className="h-4 w-4" />} onClick={showSaved}>
              Salvar Dados
            </Button>
          </div>
        )}

        {activeTab === 'notificacoes' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-dark-800 mb-1">Notificacoes</h2>
              <p className="text-sm text-dark-400">Configure o envio de email e WhatsApp</p>
            </div>

            {/* Email */}
            <div className="border border-dark-100 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-dark-800">Email (Resend)</h3>
                  <p className="text-xs text-dark-400">Configure o envio de emails com PDF anexo</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="API Key"
                  type="password"
                  placeholder="re_..."
                  hint="Chave da API Resend"
                />
                <Input
                  label="Email Remetente"
                  defaultValue="noreply@omegarad.com.br"
                  placeholder="noreply@seudominio.com"
                />
              </div>
            </div>

            {/* WhatsApp */}
            <div className="border border-dark-100 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-green-50 flex items-center justify-center">
                  <MessageCircle className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-dark-800">WhatsApp (Evolution API)</h3>
                  <p className="text-xs text-dark-400">Configure o envio de mensagens via WhatsApp</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="URL da API"
                  placeholder="https://api.evolution.com"
                />
                <Input
                  label="API Key"
                  type="password"
                  placeholder="Chave da API"
                />
                <Input
                  label="Nome da Instancia"
                  placeholder="omegarad"
                />
              </div>
            </div>

            <Button variant="primary" icon={<Save className="h-4 w-4" />} onClick={showSaved}>
              Salvar Notificacoes
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
