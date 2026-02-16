import { SetMetadata } from '@nestjs/common';

/**
 * Decorator para indicar que um endpoint exige um lock exclusivo
 * Usado em PUT/PATCH endpoints onde se edita dados
 * 
 * Exemplo: @RequiredLock()
 */
export const RequiredLock = () => SetMetadata('require-lock', true);

/**
 * Decorator para indicar que um endpoint é para visualizar
 * Permite múltiplos utilizadores, mas retorna informação de locks ativos
 * 
 * Exemplo: @ViewLock()
 */
export const ViewLock = () => SetMetadata('view-lock', true);

/**
 * Decorator para indicar que um endpoint não está relacionado com locks
 * 
 * Exemplo: @NoLock()
 */
export const NoLock = () => SetMetadata('no-lock', true);
