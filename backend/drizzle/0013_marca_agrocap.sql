UPDATE organizaciones
SET nombre = 'AgroCAP'
WHERE nombre = 'AgroSys Demo';

UPDATE usuarios
SET email = 'admin@agrocap.bo', nombre = 'Administrador AgroCAP'
WHERE email = 'admin@agrosys.bo'
  AND NOT EXISTS (SELECT 1 FROM usuarios WHERE email = 'admin@agrocap.bo');
