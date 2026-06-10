import { Router, Request, Response } from 'express';

const router = Router();

export const MUNICIPALITIES = [
  { code: '011002', name: '札幌市', prefecture: '北海道' }, { code: '012025', name: '函館市', prefecture: '北海道' }, { code: '012033', name: '小樽市', prefecture: '北海道' }, { code: '012041', name: '旭川市', prefecture: '北海道' }, { code: '012050', name: '室蘭市', prefecture: '北海道' }, { code: '012068', name: '釧路市', prefecture: '北海道' }, { code: '012076', name: '帯広市', prefecture: '北海道' },
  { code: '022012', name: '青森市', prefecture: '青森県' }, { code: '022021', name: '弘前市', prefecture: '青森県' }, { code: '022039', name: '八戸市', prefecture: '青森県' },
  { code: '032018', name: '盛岡市', prefecture: '岩手県' }, { code: '032026', name: '宮古市', prefecture: '岩手県' }, { code: '032034', name: '大船渡市', prefecture: '岩手県' },
  { code: '041009', name: '仙台市', prefecture: '宮城県' }, { code: '042021', name: '石巻市', prefecture: '宮城県' }, { code: '042030', name: '塩竈市', prefecture: '宮城県' },
  { code: '051004', name: '秋田市', prefecture: '秋田県' }, { code: '052020', name: '能代市', prefecture: '秋田県' },
  { code: '062014', name: '山形市', prefecture: '山形県' }, { code: '062022', name: '米沢市', prefecture: '山形県' },
  { code: '071005', name: '福島市', prefecture: '福島県' }, { code: '072101', name: '郡山市', prefecture: '福島県' }, { code: '072030', name: 'いわき市', prefecture: '福島県' },
  { code: '081009', name: '水戸市', prefecture: '茨城県' }, { code: '082015', name: 'つくば市', prefecture: '茨城県' }, { code: '082023', name: '日立市', prefecture: '茨城県' },
  { code: '091006', name: '宇都宮市', prefecture: '栃木県' }, { code: '092020', name: '足利市', prefecture: '栃木県' },
  { code: '101001', name: '前橋市', prefecture: '群馬県' }, { code: '102016', name: '高崎市', prefecture: '群馬県' }, { code: '102024', name: '桐生市', prefecture: '群馬県' },
  { code: '111003', name: 'さいたま市', prefecture: '埼玉県' }, { code: '112011', name: '川越市', prefecture: '埼玉県' }, { code: '112046', name: '川口市', prefecture: '埼玉県' }, { code: '112054', name: '行田市', prefecture: '埼玉県' },
  { code: '121002', name: '千葉市', prefecture: '千葉県' }, { code: '122025', name: '船橋市', prefecture: '千葉県' }, { code: '122033', name: '松戸市', prefecture: '千葉県' }, { code: '122041', name: '柏市', prefecture: '千葉県' },
  { code: '131016', name: '千代田区', prefecture: '東京都' }, { code: '131024', name: '中央区', prefecture: '東京都' }, { code: '131032', name: '港区', prefecture: '東京都' }, { code: '131041', name: '新宿区', prefecture: '東京都' }, { code: '131059', name: '文京区', prefecture: '東京都' }, { code: '131067', name: '台東区', prefecture: '東京都' }, { code: '131075', name: '墨田区', prefecture: '東京都' }, { code: '131083', name: '江東区', prefecture: '東京都' }, { code: '131091', name: '品川区', prefecture: '東京都' }, { code: '131105', name: '目黒区', prefecture: '東京都' }, { code: '131113', name: '大田区', prefecture: '東京都' }, { code: '131121', name: '世田谷区', prefecture: '東京都' }, { code: '131130', name: '渋谷区', prefecture: '東京都' }, { code: '131148', name: '中野区', prefecture: '東京都' }, { code: '131156', name: '杉並区', prefecture: '東京都' }, { code: '131164', name: '豊島区', prefecture: '東京都' }, { code: '131172', name: '北区', prefecture: '東京都' }, { code: '131181', name: '荒川区', prefecture: '東京都' }, { code: '131199', name: '板橋区', prefecture: '東京都' }, { code: '131202', name: '練馬区', prefecture: '東京都' }, { code: '131211', name: '足立区', prefecture: '東京都' }, { code: '131229', name: '葛飾区', prefecture: '東京都' }, { code: '131237', name: '江戸川区', prefecture: '東京都' }, { code: '132012', name: '八王子市', prefecture: '東京都' }, { code: '132021', name: '立川市', prefecture: '東京都' }, { code: '132039', name: '武蔵野市', prefecture: '東京都' },
  { code: '141003', name: '横浜市', prefecture: '神奈川県' }, { code: '141402', name: '川崎市', prefecture: '神奈川県' }, { code: '141801', name: '相模原市', prefecture: '神奈川県' }, { code: '142018', name: '横須賀市', prefecture: '神奈川県' }, { code: '142042', name: '鎌倉市', prefecture: '神奈川県' }, { code: '142069', name: '藤沢市', prefecture: '神奈川県' },
  { code: '151009', name: '新潟市', prefecture: '新潟県' }, { code: '152021', name: '長岡市', prefecture: '新潟県' },
  { code: '162019', name: '富山市', prefecture: '富山県' }, { code: '162027', name: '高岡市', prefecture: '富山県' },
  { code: '172014', name: '金沢市', prefecture: '石川県' }, { code: '172022', name: '七尾市', prefecture: '石川県' },
  { code: '182015', name: '福井市', prefecture: '福井県' },
  { code: '192015', name: '甲府市', prefecture: '山梨県' },
  { code: '202011', name: '長野市', prefecture: '長野県' }, { code: '202029', name: '松本市', prefecture: '長野県' }, { code: '202037', name: '上田市', prefecture: '長野県' },
  { code: '212015', name: '岐阜市', prefecture: '岐阜県' }, { code: '212023', name: '大垣市', prefecture: '岐阜県' },
  { code: '221007', name: '静岡市', prefecture: '静岡県' }, { code: '221309', name: '浜松市', prefecture: '静岡県' }, { code: '222046', name: '沼津市', prefecture: '静岡県' },
  { code: '231003', name: '名古屋市', prefecture: '愛知県' }, { code: '232017', name: '豊橋市', prefecture: '愛知県' }, { code: '232025', name: '岡崎市', prefecture: '愛知県' }, { code: '232041', name: '豊田市', prefecture: '愛知県' }, { code: '232050', name: '一宮市', prefecture: '愛知県' },
  { code: '242012', name: '津市', prefecture: '三重県' }, { code: '242021', name: '四日市市', prefecture: '三重県' },
  { code: '252018', name: '大津市', prefecture: '滋賀県' }, { code: '252026', name: '彦根市', prefecture: '滋賀県' },
  { code: '261009', name: '京都市', prefecture: '京都府' }, { code: '262013', name: '宇治市', prefecture: '京都府' }, { code: '262021', name: '亀岡市', prefecture: '京都府' },
  { code: '271004', name: '大阪市', prefecture: '大阪府' }, { code: '271403', name: '堺市', prefecture: '大阪府' }, { code: '272043', name: '豊中市', prefecture: '大阪府' }, { code: '272060', name: '吹田市', prefecture: '大阪府' }, { code: '272094', name: '高槻市', prefecture: '大阪府' }, { code: '272108', name: '東大阪市', prefecture: '大阪府' },
  { code: '281005', name: '神戸市', prefecture: '兵庫県' }, { code: '282014', name: '姫路市', prefecture: '兵庫県' }, { code: '282022', name: '尼崎市', prefecture: '兵庫県' }, { code: '282049', name: '西宮市', prefecture: '兵庫県' }, { code: '282057', name: '芦屋市', prefecture: '兵庫県' },
  { code: '292010', name: '奈良市', prefecture: '奈良県' }, { code: '292028', name: '大和高田市', prefecture: '奈良県' },
  { code: '302015', name: '和歌山市', prefecture: '和歌山県' },
  { code: '312011', name: '鳥取市', prefecture: '鳥取県' }, { code: '312029', name: '米子市', prefecture: '鳥取県' },
  { code: '322015', name: '松江市', prefecture: '島根県' }, { code: '322023', name: '浜田市', prefecture: '島根県' },
  { code: '331007', name: '岡山市', prefecture: '岡山県' }, { code: '332011', name: '倉敷市', prefecture: '岡山県' }, { code: '332029', name: '津山市', prefecture: '岡山県' },
  { code: '341003', name: '広島市', prefecture: '広島県' }, { code: '342063', name: '福山市', prefecture: '広島県' }, { code: '342047', name: '尾道市', prefecture: '広島県' }, { code: '342012', name: '呉市', prefecture: '広島県' },
  { code: '352012', name: '下関市', prefecture: '山口県' }, { code: '352039', name: '山口市', prefecture: '山口県' }, { code: '352021', name: '宇部市', prefecture: '山口県' },
  { code: '362018', name: '徳島市', prefecture: '徳島県' },
  { code: '372013', name: '高松市', prefecture: '香川県' }, { code: '372021', name: '丸亀市', prefecture: '香川県' },
  { code: '382019', name: '松山市', prefecture: '愛媛県' }, { code: '382027', name: '今治市', prefecture: '愛媛県' },
  { code: '392014', name: '高知市', prefecture: '高知県' },
  { code: '401005', name: '福岡市', prefecture: '福岡県' }, { code: '402015', name: '北九州市', prefecture: '福岡県' }, { code: '402023', name: '久留米市', prefecture: '福岡県' }, { code: '402031', name: '直方市', prefecture: '福岡県' },
  { code: '412015', name: '佐賀市', prefecture: '佐賀県' },
  { code: '422011', name: '長崎市', prefecture: '長崎県' }, { code: '422029', name: '佐世保市', prefecture: '長崎県' },
  { code: '431009', name: '熊本市', prefecture: '熊本県' }, { code: '432016', name: '八代市', prefecture: '熊本県' },
  { code: '442011', name: '大分市', prefecture: '大分県' }, { code: '442029', name: '別府市', prefecture: '大分県' },
  { code: '452017', name: '宮崎市', prefecture: '宮崎県' }, { code: '452025', name: '都城市', prefecture: '宮崎県' },
  { code: '462012', name: '鹿児島市', prefecture: '鹿児島県' }, { code: '462021', name: '鹿屋市', prefecture: '鹿児島県' },
  { code: '472018', name: '那覇市', prefecture: '沖縄県' }, { code: '472026', name: '沖縄市', prefecture: '沖縄県' }, { code: '472034', name: '浦添市', prefecture: '沖縄県' },
];

router.get('/', (req: Request, res: Response) => {
  const { prefecture } = req.query as { prefecture?: string };
  const data = prefecture ? MUNICIPALITIES.filter(m => m.prefecture === prefecture) : MUNICIPALITIES;
  res.json({ data });
});

export default router;
