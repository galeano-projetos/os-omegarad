-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'colaborador', 'tecnico', 'cliente');

-- CreateEnum
CREATE TYPE "OSStatus" AS ENUM ('DRAFT', 'PENDING_SIGNATURE', 'COMPLETED', 'CANCELED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'tecnico',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "clienteId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "razaoSocial" TEXT NOT NULL,
    "nomeFantasia" TEXT,
    "cnpj" TEXT,
    "cpf" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "endereco" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "cep" TEXT,
    "emailGrupo" TEXT,
    "isMatriz" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipamentos" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT,
    "fabricante" TEXT,
    "modelo" TEXT,
    "numeroSerie" TEXT,
    "registroAnvisa" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_orders" (
    "id" TEXT NOT NULL,
    "osNumber" INTEGER NOT NULL,
    "clienteId" TEXT NOT NULL,
    "tecnicoId" TEXT NOT NULL,
    "serviceDate" TIMESTAMP(3) NOT NULL,
    "horaInicio" TEXT,
    "horaFim" TEXT,
    "observations" TEXT,
    "equipments" JSONB,
    "status" "OSStatus" NOT NULL DEFAULT 'DRAFT',
    "pdfConteudo" BYTEA,
    "emailEnviadoEm" TIMESTAMP(3),
    "whatsappEnviadoEm" TIMESTAMP(3),
    "signatureToken" TEXT,
    "signatureTokenExpires" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_order_photos" (
    "id" TEXT NOT NULL,
    "serviceOrderId" TEXT NOT NULL,
    "conteudo" BYTEA NOT NULL,
    "mimeType" TEXT NOT NULL,
    "nomeArquivo" TEXT,
    "tamanho" INTEGER NOT NULL,
    "legenda" TEXT,
    "equipmentIndex" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_order_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_order_signatures" (
    "id" TEXT NOT NULL,
    "serviceOrderId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "nomeSignatario" TEXT NOT NULL,
    "cpfSignatario" TEXT,
    "cargoSignatario" TEXT,
    "imagemAssinatura" BYTEA NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "assinadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_order_signatures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_cnpj_key" ON "clientes"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "equipamentos_clienteId_numeroSerie_key" ON "equipamentos"("clienteId", "numeroSerie");

-- CreateIndex
CREATE UNIQUE INDEX "service_orders_osNumber_key" ON "service_orders"("osNumber");

-- CreateIndex
CREATE UNIQUE INDEX "service_orders_signatureToken_key" ON "service_orders"("signatureToken");

-- CreateIndex
CREATE INDEX "service_order_photos_serviceOrderId_idx" ON "service_order_photos"("serviceOrderId");

-- CreateIndex
CREATE INDEX "service_order_photos_serviceOrderId_equipmentIndex_idx" ON "service_order_photos"("serviceOrderId", "equipmentIndex");

-- CreateIndex
CREATE INDEX "service_order_signatures_serviceOrderId_idx" ON "service_order_signatures"("serviceOrderId");

-- CreateIndex
CREATE INDEX "service_order_signatures_tipo_idx" ON "service_order_signatures"("tipo");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipamentos" ADD CONSTRAINT "equipamentos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_tecnicoId_fkey" FOREIGN KEY ("tecnicoId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_order_photos" ADD CONSTRAINT "service_order_photos_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "service_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_order_signatures" ADD CONSTRAINT "service_order_signatures_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "service_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

