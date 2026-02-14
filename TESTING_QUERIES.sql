-- FleetGate - Queries SQL para Testes
-- Execute estas queries no PostgreSQL para verificar os dados

-- ========================================
-- 1. UPGRADE DE VEÍCULOS COM APROVAÇÃO ADMIN
-- ========================================

-- Ver contrato com upgrade aprovado
SELECT 
  c."contractNumber",
  c.status,
  u."fullName" as cliente,
  og.name as "grupoOriginal",
  vg.name as "grupoAtual",
  v.make || ' ' || v.model as veiculo,
  admin."fullName" as "aprovadoPor",
  c."upgradeReason" as razao,
  c."upgradeCost" as custo,
  c."upgradeApprovedAt" as "dataAprovacao"
FROM "Contract" c
LEFT JOIN "User" u ON u.id = c."clientId"
LEFT JOIN "VehicleGroup" og ON og.id = c."originalVehicleGroupId"
LEFT JOIN "VehicleGroup" vg ON vg.id = c."vehicleGroupId"
LEFT JOIN "Vehicle" v ON v.id = c."vehicleId"
LEFT JOIN "User" admin ON admin.id = c."upgradeApprovedBy"
WHERE c."originalVehicleGroupId" IS NOT NULL;

-- Resultado esperado:
-- contractNumber: CT2026000002
-- status: DRAFT
-- cliente: António Oliveira
-- grupoOriginal: SUV
-- grupoAtual: Premium
-- veiculo: BMW Série 5
-- aprovadoPor: Admin Lisboa
-- razao: Cliente VIP com 12 alugueres - cortesia
-- custo: 0
-- dataAprovacao: 2026-02-15


-- ========================================
-- 2. CLIENTES BLACKLISTED
-- ========================================

-- Ver todos os clientes blacklisted
SELECT 
  "fullName" as nome,
  email,
  "clientRating" as rating,
  "totalRentals" as "totalAlugueres",
  "blacklistReason" as razao,
  "blacklistedAt" as "dataBlacklist",
  admin."fullName" as "blacklistedPor"
FROM "User" u
LEFT JOIN "User" admin ON admin.id = u."blacklistedBy"
WHERE u."isBlacklisted" = true;

-- Resultado esperado:
-- nome: Manuel Problemas
-- email: manuel.problemas@email.pt
-- rating: 1.5
-- totalAlugueres: 3
-- razao: Múltiplas devoluções atrasadas e danos não reportados
-- dataBlacklist: 2026-02-14
-- blacklistedPor: Admin Lisboa


-- ========================================
-- 3. CONTRATOS COM DANOS
-- ========================================

-- Ver contratos com danos registrados
SELECT 
  c."contractNumber",
  c.status,
  u."fullName" as cliente,
  v.make || ' ' || v.model as veiculo,
  c."damageOnReturn" as dano,
  c."damageCost" as "custoDano",
  c."totalCost" as "custoTotal",
  c."depositAmount" as deposito,
  c."depositReturned" as "depositoDevolvido"
FROM "Contract" c
JOIN "User" u ON u.id = c."clientId"
JOIN "Vehicle" v ON v.id = c."vehicleId"
WHERE c."damageCost" > 0;

-- Resultado esperado:
-- contractNumber: CT2026000003
-- status: COMPLETED
-- cliente: Sofia Rodrigues
-- veiculo: Fiat 500
-- dano: Amolgadela porta lateral esquerdo
-- custoDano: 150
-- custoTotal: 255
-- deposito: 200
-- depositoDevolvido: 50


-- ========================================
-- 4. CATÁLOGO DE DANOS
-- ========================================

-- Ver todos os tipos de danos
SELECT 
  name as nome,
  category as categoria,
  severity as gravidade,
  "estimatedCost" as "custoEstimado",
  "minCost" as "custoMin",
  "maxCost" as "custoMax",
  description as descricao
FROM "DamageType"
ORDER BY category, severity;

-- Resultado esperado: 10 tipos de danos ordenados por categoria


-- ========================================
-- 5. RESERVAS E CONTRATOS
-- ========================================

-- Ver todas as reservas com status
SELECT 
  r."reservationNumber",
  r.status,
  u."fullName" as cliente,
  vg.name as grupo,
  v.make || ' ' || v.model as veiculo,
  r."pickupDate" as recolha,
  r."dropoffDate" as devolucao,
  s1.name as "estacaoRecolha",
  s2.name as "estacaoDevolucao"
FROM "Reservation" r
JOIN "User" u ON u.id = r."clientId"
LEFT JOIN "VehicleGroup" vg ON vg.id = r."vehicleGroupId"
LEFT JOIN "Vehicle" v ON v.id = r."vehicleId"
JOIN "Station" s1 ON s1.id = r."pickupStationId"
JOIN "Station" s2 ON s2.id = r."dropoffStationId"
ORDER BY r."reservationNumber";

-- Resultado esperado: 3 reservas (RV2026000001, RV2026000002, RV2026000003)


-- Ver contratos com links para reservas
SELECT 
  c."contractNumber",
  c.status,
  r."reservationNumber",
  u."fullName" as cliente,
  vg.name as grupo,
  c."totalCost" as total
FROM "Contract" c
LEFT JOIN "Reservation" r ON r.id = c."reservationId"
JOIN "User" u ON u.id = c."clientId"
JOIN "VehicleGroup" vg ON vg.id = c."vehicleGroupId"
ORDER BY c."contractNumber";

-- Resultado esperado: 3 contratos (CT2026000001, CT2026000002, CT2026000003)


-- ========================================
-- 6. CONDUTORES ADICIONAIS
-- ========================================

-- Ver condutores adicionais por contrato
SELECT 
  c."contractNumber",
  ad."fullName" as condutor,
  ad."documentType" as "tipoDoc",
  ad."documentNumber" as numeroDoc,
  ad."driversLicenseNumber" as "numCarta",
  ad."dailyCost" as "custoDiario",
  ad."totalCost" as "custoTotal",
  u."fullName" as "clienteSistema"
FROM "AdditionalDriver" ad
JOIN "Contract" c ON c.id = ad."contractId"
LEFT JOIN "User" u ON u.id = ad."userId"
ORDER BY c."contractNumber", ad."fullName";

-- Resultado esperado:
-- CT2026000002: Sofia Rodrigues (€70) + Ricardo Santos sem conta (€70)


-- ========================================
-- 7. VEÍCULOS POR ESTAÇÃO E STATUS
-- ========================================

-- Ver distribuição de veículos por estação
SELECT 
  s.name as estacao,
  s."isFictitious" as ficticia,
  COUNT(v.id) as "totalVeiculos",
  COUNT(CASE WHEN v.status = 'AVAILABLE' THEN 1 END) as disponiveis,
  COUNT(CASE WHEN v.status = 'RENTED' THEN 1 END) as alugados,
  COUNT(CASE WHEN v.status = 'RESERVED' THEN 1 END) as reservados,
  COUNT(CASE WHEN v.status = 'MAINTENANCE' THEN 1 END) as manutencao
FROM "Station" s
LEFT JOIN "Vehicle" v ON v."stationId" = s.id
GROUP BY s.id, s.name, s."isFictitious"
ORDER BY s."isFictitious", s.name;

-- Resultado esperado:
-- Estações activas (Lisboa, Porto, Faro) com veículos
-- Estações fictícias (Manutenção, Roubados) com poucos ou 0 veículos


-- ========================================
-- 8. UTILIZADORES POR ROLE E ESTAÇÃO
-- ========================================

-- Ver hierarquia de utilizadores
SELECT 
  u."fullName" as nome,
  u.email,
  u.role,
  u.status,
  s.name as estacao,
  u."isBlacklisted" as blacklisted,
  u."clientRating" as rating,
  u."totalRentals" as alugueres
FROM "User" u
LEFT JOIN "Station" s ON s.id = u."stationId"
ORDER BY 
  CASE u.role
    WHEN 'IT' THEN 1
    WHEN 'ADMIN' THEN 2
    WHEN 'STAFF' THEN 3
    WHEN 'FLEET' THEN 4
    WHEN 'CLIENT' THEN 5
  END,
  u."fullName";

-- Resultado esperado:
-- 1. IT User (acesso global)
-- 2. Admin Lisboa (Lisboa Airport)
-- 3. Staff Lisboa (Lisboa Airport)
-- 4. Staff Porto (Porto Airport)
-- 5. Fleet Faro (Faro Airport)
-- 6. António Oliveira (cliente VIP, 4.8★)
-- 7. Sofia Rodrigues (cliente, 5.0★)
-- 8. Manuel Problemas (blacklisted, 1.5★)


-- ========================================
-- 9. ACTIVITY LOGS DE AUDITORIA
-- ========================================

-- Ver logs de ações importantes
SELECT 
  al."createdAt" as data,
  al."actionType" as acao,
  u."fullName" as utilizador,
  u.role,
  al."entityType" as entidade,
  al."entityId" as "idEntidade",
  al."ipAddress" as ip,
  al.details
FROM "ActivityLog" al
JOIN "User" u ON u.id = al."userId"
ORDER BY al."createdAt" DESC;

-- Resultado esperado:
-- 3 logs: upgrade aprovado, contrato criado, cliente blacklisted


-- ========================================
-- 10. NOTIFICAÇÕES
-- ========================================

-- Ver notificações por tipo
SELECT 
  n.type as tipo,
  n.status,
  u."fullName" as destinatario,
  n.title as titulo,
  n.message as mensagem,
  n."createdAt" as criada
FROM "Notification" n
JOIN "User" u ON u.id = n."userId"
ORDER BY n."createdAt" DESC;

-- Resultado esperado:
-- 4 notificações: reserva confirmada, upgrade aprovado, manutenção, pagamento


-- ========================================
-- 11. PAGAMENTOS POR CONTRATO
-- ========================================

-- Ver pagamentos completos
SELECT 
  c."contractNumber",
  p.amount as valor,
  p.method as metodo,
  p.status,
  p."paidAt" as "dataPagamento",
  p."transactionId" as transacao,
  p.notes as notas
FROM "Payment" p
JOIN "Contract" c ON c.id = p."contractId"
ORDER BY c."contractNumber";

-- Resultado esperado: 3 pagamentos (depósito, parcial, final com danos)


-- ========================================
-- 12. MANUTENÇÕES
-- ========================================

-- Ver manutenções agendadas e em progresso
SELECT 
  m.type as tipo,
  m.status,
  v.make || ' ' || v.model as veiculo,
  v."licensePlate" as matricula,
  m."scheduledDate" as agendada,
  m."completedDate" as concluida,
  m.cost as custo,
  m.supplier as fornecedor,
  m.description as descricao
FROM "Maintenance" m
JOIN "Vehicle" v ON v.id = m."vehicleId"
ORDER BY m."scheduledDate";

-- Resultado esperado: 3 manutenções (preventiva, correctiva, inspecção)


-- ========================================
-- 13. PERMISSÕES DE UTILIZADORES
-- ========================================

-- Ver permissões especiais
SELECT 
  u."fullName" as utilizador,
  u.role,
  up.permission as permissao,
  up."grantedAt" as concedida,
  admin."fullName" as "concedidaPor"
FROM "UserPermission" up
JOIN "User" u ON u.id = up."userId"
LEFT JOIN "User" admin ON admin.id = up."grantedBy"
ORDER BY u.role, u."fullName", up.permission;

-- Resultado esperado:
-- Admin: vehicle.upgrade.approve, staff.move, user.blacklist
-- Staff: vehicle.upgrade.request


-- ========================================
-- 14. ESTATÍSTICAS GERAIS
-- ========================================

-- Dashboard de métricas
SELECT 
  'Utilizadores' as metrica,
  COUNT(*) as total,
  COUNT(CASE WHEN "isBlacklisted" THEN 1 END) as blacklisted
FROM "User"
UNION ALL
SELECT 
  'Veículos',
  COUNT(*),
  COUNT(CASE WHEN status = 'AVAILABLE' THEN 1 END)
FROM "Vehicle"
UNION ALL
SELECT 
  'Reservas',
  COUNT(*),
  COUNT(CASE WHEN status = 'CONFIRMED' THEN 1 END)
FROM "Reservation"
UNION ALL
SELECT 
  'Contratos',
  COUNT(*),
  COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END)
FROM "Contract"
UNION ALL
SELECT 
  'Pagamentos',
  COUNT(*),
  COUNT(CASE WHEN status = 'PAID' THEN 1 END)
FROM "Payment";


-- ========================================
-- 15. VERIFICAÇÃO DE UPGRADE WORKFLOW
-- ========================================

-- Query completa para validar workflow de upgrade
SELECT 
  '=== UPGRADE WORKFLOW ===' as section,
  c."contractNumber" as "Contrato",
  c.status as "Status",
  u."fullName" as "Cliente",
  u."clientRating" as "Rating",
  u."totalRentals" as "TotalAlugueres",
  og.name as "GrupoOriginal",
  og."dailyRate" as "PrecoOriginal",
  vg.name as "GrupoAtual",
  vg."dailyRate" as "PrecoAtual",
  c."upgradeCost" as "CustoUpgrade",
  admin."fullName" as "AprovadoPor",
  admin.role as "RoleAprovador",
  c."upgradeReason" as "RazaoUpgrade",
  c."upgradeApprovedAt" as "DataAprovacao"
FROM "Contract" c
JOIN "User" u ON u.id = c."clientId"
LEFT JOIN "VehicleGroup" og ON og.id = c."originalVehicleGroupId"
JOIN "VehicleGroup" vg ON vg.id = c."vehicleGroupId"
LEFT JOIN "User" admin ON admin.id = c."upgradeApprovedBy"
WHERE c."originalVehicleGroupId" IS NOT NULL;

-- Validações esperadas:
-- ✅ originalVehicleGroupId preenchido (SUV)
-- ✅ vehicleGroupId diferente (Premium)
-- ✅ upgradeApprovedBy é um ADMIN
-- ✅ upgradeReason documentado
-- ✅ upgradeApprovedAt preenchido
-- ✅ Cliente VIP (rating alto, muitos alugueres)


-- ========================================
-- 16. VERIFICAÇÃO DE INTEGRIDADE
-- ========================================

-- Verificar contratos sem erros
SELECT 
  CASE 
    WHEN COUNT(*) FILTER (WHERE "vehicleId" IS NULL) > 0 
    THEN '❌ Há contratos sem veículo'
    ELSE '✅ Todos os contratos têm veículo'
  END as "CheckVeiculos",
  CASE 
    WHEN COUNT(*) FILTER (WHERE "clientId" IS NULL) > 0 
    THEN '❌ Há contratos sem cliente'
    ELSE '✅ Todos os contratos têm cliente'
  END as "CheckClientes",
  CASE 
    WHEN COUNT(*) FILTER (WHERE "totalCost" < 0) > 0 
    THEN '❌ Há contratos com custo negativo'
    ELSE '✅ Todos os custos são válidos'
  END as "CheckCustos"
FROM "Contract";


-- Verificar veículos sem erros
SELECT 
  CASE 
    WHEN COUNT(*) FILTER (WHERE "stationId" IS NULL) > 0 
    THEN '❌ Há veículos sem estação'
    ELSE '✅ Todos os veículos têm estação'
  END as "CheckEstacoes",
  CASE 
    WHEN COUNT(*) FILTER (WHERE "vehicleGroupId" IS NULL) > 0 
    THEN '❌ Há veículos sem grupo'
    ELSE '✅ Todos os veículos têm grupo'
  END as "CheckGrupos"
FROM "Vehicle";


-- ========================================
-- FIM DAS QUERIES DE TESTE
-- ========================================

-- Para executar todas as queries de uma vez:
-- psql -h localhost -U postgres -d FleetGate -f TESTING_QUERIES.sql

-- Para executar via Docker:
-- docker exec -i fleetgate-db psql -U postgres -d FleetGate -f /path/to/TESTING_QUERIES.sql
