import { Preference } from "../value-objects/Preference";
import { Salary } from "../value-objects/Salary";
import { Subscriber } from "./Subscriber"
import { Vacancy } from "./Vacancy";


describe('Entity: Subscriber', () => {
	describe('Preference Management', () => {
		it('should allow add preferences until 5', () => {
			const subscriber = new Subscriber('telegram-123');

			for (let i = 0; i < 5; i++) {
				subscriber.addPreference(new Preference(`Area ${i}`, 'SP', new Salary(1000)));
			}

			expect(subscriber.getPreferences().length).toBe(5);
		})

		it('should block the adition of sixth preference', () => {
			const subscriber = new Subscriber('telegram-123');

			for (let i = 0; i < 5; i++) {
				subscriber.addPreference(new Preference(`Area ${i}`, 'SP', new Salary(1000)));
			}

			expect(() => {
				subscriber.addPreference(new Preference('TI', 'RJ', new Salary(5000)))
			}).toThrow("Limite de preferências atingido.") //TODO: change to error code
		})
	})

	describe('Business Rule: Vacancy Match (hasInterest)', () => {
		let subscriber: Subscriber;

		beforeEach(() => {
			subscriber = new Subscriber('telegram-123', true);
		})

		it('should not have interest if subscriber is inactive', () => {
			const inactiveSubscriber = new Subscriber('telgram-456', false);
			inactiveSubscriber.addPreference(new Preference('TI', 'SP', new Salary(5000)));

			const vacancy = new Vacancy('1', 'Dev', 'TI', 'SP', new Salary(6000));
      
      expect(inactiveSubscriber.hasInterest(vacancy)).toBe(false);
		})

		it('não deve ter interesse se não tiver nenhuma preferência cadastrada', () => {
      const vacancy = new Vacancy('1', 'Dev', 'TI', 'SP', new Salary(6000));
      // Assinante não tem preferências adicionadas
      expect(subscriber.hasInterest(vacancy)).toBe(false);
    });

    it('deve ter interesse quando área, região baterem e salário for maior', () => {
      subscriber.addPreference(new Preference('TI', 'SP', new Salary(5000)));
      const vagaBoa = new Vacancy('1', 'Engenheiro de Software', 'TI', 'SP', new Salary(8000));
      
      expect(subscriber.hasInterest(vagaBoa)).toBe(true);
    });

    it('não deve ter interesse se o salário da Vacancy for menor que o desejado', () => {
      subscriber.addPreference(new Preference('TI', 'SP', new Salary(10000)));
      const vagaJunior = new Vacancy('1', 'Suporte', 'TI', 'SP', new Salary(3000));
      
      expect(subscriber.hasInterest(vagaJunior)).toBe(false);
    });

    it('deve ter interesse se a preferência de região for BR (Nacional)', () => {
      // O subscriber aceita TI em qualquer lugar do Brasil
      subscriber.addPreference(new Preference('TI', 'BR', new Salary(5000)));
      
      const vagaNoAcre = new Vacancy('1', 'Analista', 'TI', 'AC', new Salary(6000));
      const vagaNoSul = new Vacancy('2', 'Analista', 'TI', 'RS', new Salary(6000));
      
      expect(subscriber.hasInterest(vagaNoAcre)).toBe(true);
      expect(subscriber.hasInterest(vagaNoSul)).toBe(true);
    });

    it('deve ter interesse se QUALQUER uma das preferências bater (OR logic)', () => {
      subscriber.addPreference(new Preference('Saúde', 'RJ', new Salary(5000)));
      subscriber.addPreference(new Preference('TI', 'SP', new Salary(8000)));
      
      // A Vacancy não bate com Saúde, mas bate com a de TI
      const vagaTI = new Vacancy('1', 'Dev', 'TI', 'SP', new Salary(9000));
      
      expect(subscriber.hasInterest(vagaTI)).toBe(true);
    });
	})
})