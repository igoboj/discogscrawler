
GO
DROP FUNCTION dbo.GetDecade
GO
CREATE FUNCTION dbo.GetDecade (@input INT)
RETURNS nvarchar(5)
AS BEGIN
	RETURN CASE 
		WHEN @input >= 1950 AND @input < 1960 THEN '1950s'
		WHEN @input >= 1960 AND @input < 1970 THEN '1960s'
		WHEN @input >= 1970 AND @input < 1980 THEN '1970s'
		WHEN @input >= 1980 AND @input < 1990 THEN '1980s'
		WHEN @input >= 1990 AND @input < 2000 THEN '1990s'
		WHEN @input >= 2000 AND @input < 2010 THEN '2000s'
		WHEN @input >= 2010 AND @input < 2020 THEN '2010s'
		ELSE '1800s'
	END
END

Print(dbo.GetDecade(1967))