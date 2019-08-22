
--
GO
--
-- C
--
SELECT Decade, AlbumCount = COUNT(IdRelease) 
FROM 
	(
	SELECT IdRelease, Decade = dbo.GetDecade(Published)
	FROM Release
) AS rbdc
GROUP BY Decade
--
GO
--
-- D1
--
SELECT CyrillicCount = COUNT(Cyrillic), Cyrillic, Country
FROM
	(
	SELECT Country, Cyrillic = CASE WHEN Name like N'%[а-зА-З]%'
					THEN 'true'
					ELSE 'false'
				END
	FROM Release
) AS t1
GROUP BY Cyrillic, Country
--
GO
--
GO
--
-- D2
--
SELECT CyrillicPercent = 100*SUM(Cyrillic)/CAST(SUM(1) AS FLOAT), Country, GenreName
FROM
	(
	SELECT ReleaseGenre.GenreName AS GenreName, Country, Cyrillic = CASE WHEN Name like N'%[а-зА-З]%'
					THEN 1
					ELSE 0
				END
	FROM Release
	INNER JOIN ReleaseGenre ON Release.IdRelease = ReleaseGenre.IdRelease
) AS t1
GROUP BY Country, GenreName
ORDER BY GenreName, Country
--
-- E1
--
SELECT AlbumCount = COUNT(IdRelease), Genres
FROM 
	(
	SELECT IdRelease, Genres = CASE GenreCount 
	WHEN 1 THEN '1'
	WHEN 2 THEN '2'
	WHEN 3 THEN '3'
	ELSE '4+'
	END
	FROM 
		(
		SELECT IdRelease, GenreCount = COUNT(GenreName)
		FROM ReleaseGenre
		GROUP BY IdRelease
	) AS t1
) AS t2
GROUP BY Genres
ORDER BY Genres ASC
--
GO
--
-- E2
--
SELECT AlbumCount = COUNT(IdRelease), Styles
FROM 
	(
	SELECT IdRelease, Styles = CASE StyleCount 
	WHEN 1 THEN '1'
	WHEN 2 THEN '2'
	WHEN 3 THEN '3'
	ELSE '4+'
	END
	FROM 
		(
		SELECT IdRelease, StyleCount = COUNT(StyleName)
		FROM ReleaseStyle
		GROUP BY IdRelease
	) AS t1
) AS t2
GROUP BY Styles
ORDER BY Styles ASC


