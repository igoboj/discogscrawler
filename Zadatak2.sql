
/* Releases which have master count */
SELECT COUNT(IdRelease) AS ReleaseCount, HasMaster = 'true'
FROM Release
WHERE IdMaster IS NOT NULL
UNION 
(
	SELECT COUNT(IdRelease) AS ReleaseCount, Master = 'false'
	FROM Release
	WHERE IdMaster IS NULL
)
--
GO
--
/* Genre-style counts per release and master */
SELECT StyleCount, GenreCount, t1.Kind
FROM (
	SELECT COUNT(IdRelease) AS StyleCount, 'Release' AS Kind
	FROM ReleaseStyle
	UNION 
	SELECT StyleCount = Count(IdMaster), Kind = 'Master'
	FROM MasterStyle style
) t1
FULL OUTER JOIN (
	SELECT COUNT(IdRelease) AS GenreCount, 'Release' AS Kind
	FROM ReleaseGenre
	UNION
	SELECT GenreCount = Count(IdMaster), Kind = 'Master'
	FROM MasterGenre
) AS t2 ON t1.Kind  = t2.Kind 
--
GO
--
-- A
-- 
/* Release genres counts list */
SELECT GenreName, COUNT(IdRelease) AS GenreCount
FROM ReleaseGenre
GROUP BY GenreName
ORDER BY GenreCount DESC
--
GO
--
-- B
-- 
/* Release styles counts list */
SELECT StyleName, COUNT(IdRelease) AS StyleCount 
FROM ReleaseStyle
GROUP BY StyleName
ORDER BY StyleCount DESC
--
GO
--
-- C1
--
/* Releases per Master */
SELECT TOP 20 WITH TIES t1.IdMaster, t1.Name,  AlbumCount = Count([IdRelease])
  FROM (
  SELECT r.IdRelease, r.IdMaster, m.Name
  FROM Release r
  JOIN Master m ON m.IdMaster = r.IdMaster
  ) t1
  GROUP BY t1.IdMaster, t1.Name
  ORDER BY AlbumCount DESC
--
GO
--
-- C2
--
/* Releases per Name */
SELECT TOP 20 WITH TIES Name, AlbumCount = Count([IdRelease])
  FROM [discogs].[dbo].[Release]
  GROUP BY Name
  ORDER BY AlbumCount DESC
--