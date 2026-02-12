import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Iniciando seed do banco de dados...')

  // Cria usuário admin
  const adminPassword = await hash('admin123', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@omegarad.com.br' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@omegarad.com.br',
      password: adminPassword,
      role: 'admin',
    },
  })
  console.log(`Admin criado: ${admin.email}`)

  // Cria técnico de exemplo
  const tecnicoPassword = await hash('tecnico123', 12)
  const tecnico = await prisma.user.upsert({
    where: { email: 'tecnico@omegarad.com.br' },
    update: {},
    create: {
      name: 'João Silva',
      email: 'tecnico@omegarad.com.br',
      password: tecnicoPassword,
      role: 'tecnico',
    },
  })
  console.log(`Técnico criado: ${tecnico.email}`)

  // Cria clientes de exemplo
  const cliente1 = await prisma.cliente.upsert({
    where: { cnpj: '12345678000190' },
    update: {},
    create: {
      razaoSocial: 'Hospital São Paulo LTDA',
      nomeFantasia: 'Hospital São Paulo',
      cnpj: '12345678000190',
      email: 'contato@hospitalsaopaulo.com.br',
      telefone: '11999998888',
      endereco: 'Rua das Flores, 100',
      cidade: 'São Paulo',
      estado: 'SP',
      cep: '01001000',
    },
  })
  console.log(`Cliente criado: ${cliente1.razaoSocial}`)

  const cliente2 = await prisma.cliente.upsert({
    where: { cnpj: '98765432000110' },
    update: {},
    create: {
      razaoSocial: 'Clínica Radiológica Central LTDA',
      nomeFantasia: 'Clínica Central',
      cnpj: '98765432000110',
      email: 'admin@clinicacentral.com.br',
      telefone: '11988887777',
      endereco: 'Av. Paulista, 500, Sala 301',
      cidade: 'São Paulo',
      estado: 'SP',
      cep: '01310100',
    },
  })
  console.log(`Cliente criado: ${cliente2.razaoSocial}`)

  // Cria usuário cliente
  const clientePassword = await hash('cliente123', 12)
  await prisma.user.upsert({
    where: { email: 'contato@hospitalsaopaulo.com.br' },
    update: {},
    create: {
      name: 'Maria Santos',
      email: 'contato@hospitalsaopaulo.com.br',
      password: clientePassword,
      role: 'cliente',
      clienteId: cliente1.id,
    },
  })
  console.log('Usuário cliente criado')

  // Cria equipamentos de exemplo
  await prisma.equipamento.upsert({
    where: { clienteId_numeroSerie: { clienteId: cliente1.id, numeroSerie: 'RX-2024-001' } },
    update: {},
    create: {
      clienteId: cliente1.id,
      nome: 'Raio-X Convencional',
      tipo: 'Raio-X',
      fabricante: 'Siemens',
      modelo: 'Multix Select DR',
      numeroSerie: 'RX-2024-001',
      registroAnvisa: '10345670001',
    },
  })

  await prisma.equipamento.upsert({
    where: { clienteId_numeroSerie: { clienteId: cliente1.id, numeroSerie: 'TC-2024-001' } },
    update: {},
    create: {
      clienteId: cliente1.id,
      nome: 'Tomógrafo',
      tipo: 'Tomografia',
      fabricante: 'GE Healthcare',
      modelo: 'Revolution CT',
      numeroSerie: 'TC-2024-001',
      registroAnvisa: '10345670002',
    },
  })

  await prisma.equipamento.upsert({
    where: { clienteId_numeroSerie: { clienteId: cliente2.id, numeroSerie: 'MG-2024-001' } },
    update: {},
    create: {
      clienteId: cliente2.id,
      nome: 'Mamógrafo',
      tipo: 'Mamografia',
      fabricante: 'Hologic',
      modelo: 'Selenia Dimensions',
      numeroSerie: 'MG-2024-001',
      registroAnvisa: '10345670003',
    },
  })

  console.log('Equipamentos criados')
  console.log('')
  console.log('=== SEED FINALIZADO ===')
  console.log('')
  console.log('Credenciais de acesso:')
  console.log('  Admin:   admin@omegarad.com.br / admin123')
  console.log('  Técnico: tecnico@omegarad.com.br / tecnico123')
  console.log('  Cliente: contato@hospitalsaopaulo.com.br / cliente123')
}

main()
  .catch((e) => {
    console.error('Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
