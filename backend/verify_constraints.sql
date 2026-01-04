SELECT constraint_name, table_name 
FROM information_schema.table_constraints
WHERE constraint_type = 'UNIQUE'
AND table_name IN ('dietary_preferences', 'nutrition_goals', 'gamification')
AND constraint_name LIKE '%user_id_unique'
ORDER BY table_name;
