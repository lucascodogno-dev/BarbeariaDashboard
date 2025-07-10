// backend/src/controllers/serviceController.js
const Service = require('../models/Service');

// Cria um novo serviço
exports.createService = async (req, res) => {
  try {
    const newService = new Service(req.body);
    await newService.save();
    res.status(201).json(newService);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Serviço com este nome já existe.' });
    }
    console.error('Erro ao criar serviço:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao criar serviço.' });
  }
};

// Obtém todos os serviços
exports.getServices = async (req, res) => {
  try {
    const services = await Service.find();
    res.status(200).json(services);
  } catch (error) {
    console.error('Erro ao obter serviços:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao obter serviços.' });
  }
};

// Atualiza um serviço existente
exports.updateService = async (req, res) => {
  try {
    const updatedService = await Service.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedService) {
      return res.status(404).json({ message: 'Serviço não encontrado.' });
    }
    res.status(200).json(updatedService);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Serviço com este nome já existe.' });
    }
    console.error('Erro ao atualizar serviço:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao atualizar serviço.' });
  }
};

// Deleta um serviço
exports.deleteService = async (req, res) => {
  try {
    const deletedService = await Service.findByIdAndDelete(req.params.id);
    if (!deletedService) {
      return res.status(404).json({ message: 'Serviço não encontrado.' });
    }
    res.status(200).json({ message: 'Serviço deletado com sucesso.' });
  } catch (error) {
    console.error('Erro ao deletar serviço:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao deletar serviço.' });
  }
};