import * as path from "path";
import * as fs from "fs-extra";
import axios from "axios";

interface ITafseer {
    ayah: string;
    data: string;
    ayahs: string[];
    ayahs_start: number;
}

const TAFSEER_PATH = path.join(process.env.zcPath!, "Tafseer", "المختصر في التفسير");
const BENIFITS = "* من فوائد الآيات:";
const BENIFITS_TITLE = "من فوائد الآيات";
const surahsMap = new Map<number, { name: string; size: number }>();

async function main() {
    let surahIndex = 1;
    let ayahIndex = 1;

    setSurahsMap();
    for (let pageIndex = 1; pageIndex <= 668; pageIndex++) {
        let content = "---\ntype: tafseer\nneura-cache: synonymous\nneura-cache-tags: تفسير\n---";
        const response = await axios.get<ITafseer>(`https://read.tafsir.one/get.php?uth&src=almukhtasar&s=${surahIndex}&a=${ayahIndex}`);
        const tafseerPage = response.data;
        for (const ayah of (tafseerPage.ayahs || [tafseerPage.ayah])) {
            const surah = surahsMap.get(surahIndex)!;

            const start = tafseerPage.data.indexOf(toArabicDigits(ayahIndex.toString()) + "-") + 3;
            let end = tafseerPage.data.indexOf(toArabicDigits((ayahIndex + 1).toString()) + "-");
            if (end === -1) {
                end = tafseerPage.data.indexOf(BENIFITS);
            }
            const ayahTafseer = tafseerPage.data.substring(start, end);
            content += `\n> ${ayah}\n- ${getAyahLink(surah.name, ayahIndex)} ${ayahTafseer}`;
            ayahIndex++;
            if (ayahIndex > surah.size) {
                surahIndex++;
                ayahIndex = 1;
            }
        }

        const benifitsStart = tafseerPage.data.indexOf(BENIFITS);
        const benifitsContent = tafseerPage.data
            .substring(benifitsStart + BENIFITS.length, tafseerPage.data.length - 1)
            .replace(/•/g, "- ");
        content += `\n## ${BENIFITS_TITLE}${benifitsContent}`;

        const tafseerFilePath = `${TAFSEER_PATH}/المختصر في التفسير-${toArabicDigits(pageIndex.toString())}-gen.md`;
        await fs.outputFile(tafseerFilePath, content.trim());
    }
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});

function toArabicDigits(dig: string) {
    var id = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
    return dig.replace(/[0-9]/g, function (w) {
        return id[+w];
    });
}

function getAyahLink(surahName: string, ayahIndex: number) {
    return `[[${surahName}-${ayahIndex}]]`;
}

function setSurahsMap() {
    const quranJsonPath = require.resolve("quran-json/dist/quran.json");
    const surahsJson = fs.readJsonSync(quranJsonPath);

    for (const surah of surahsJson) {
        surahsMap.set(surah.id, { name: surah.name, size: surah.verses.length });
    }
}
