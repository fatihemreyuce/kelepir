import { MailService } from './mail.service';
import { PriceAlertMail } from './mail.types';

const sample: PriceAlertMail = {
  to: 'user@kelepir.dev',
  gameTitle: 'Test Game',
  targetPrice: 200,
  currentPrice: 149.99,
  currency: 'TRY',
  url: 'http://store/deal',
};

describe('MailService', () => {
  let service: MailService;
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    service = new MailService();
    fetchMock = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchMock.mockRestore();
    delete process.env.RESEND_API_KEY;
    delete process.env.MAIL_FROM;
  });

  it('RESEND_API_KEY yoksa fetch çağırmadan sessizce döner', async () => {
    process.env.RESEND_API_KEY = '';
    await service.sendPriceAlert(sample);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('key varsa Resend API\'ye doğru POST atar', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    process.env.MAIL_FROM = 'Kelepir <a@b.co>';
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: 'x' }) } as Response);

    await service.sendPriceAlert(sample);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    const req = init as RequestInit;
    expect(req.method).toBe('POST');
    expect((req.headers as Record<string, string>).Authorization).toBe('Bearer test-key');
    const body = JSON.parse(req.body as string);
    expect(body.from).toBe('Kelepir <a@b.co>');
    expect(body.to).toBe('user@kelepir.dev');
    expect(body.subject).toContain('Test Game');
  });

  it('Resend non-ok yanıtında hata fırlatır', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    fetchMock.mockResolvedValue({ ok: false, status: 422 } as Response);
    await expect(service.sendPriceAlert(sample)).rejects.toThrow();
  });
});
